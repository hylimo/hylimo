import {
    assertString,
    assign,
    ExecutableConstExpression,
    ExecutableNumberLiteralExpression,
    Expression,
    fun,
    FunctionObject,
    functionType,
    IdentifierExpression,
    IndexExpression,
    InterpreterModule,
    InvocationExpression,
    jsFun,
    NumberLiteralExpression,
    OperatorExpression,
    parse,
    RuntimeError,
    StringLiteralExpression
} from "@hylimo/core";

/**
 * Module providing the properties and methods content handler
 * Requires the sections content handler
 */
export const propertiesAndMethodsModule = InterpreterModule.create(
    "uml/classifier/propertiesAndMethods",
    [],
    [],
    [
        assign(
            "_classifierEntryScopeGenerator",
            fun([
                ...parse(
                    `
                        (visibility, scope) = args
                    `
                ),
                jsFun(
                    (args, context) => {
                        const scopeFunction = args.getLocalFieldOrUndefined(0)!.value;
                        if (!(scopeFunction instanceof FunctionObject)) {
                            throw new Error("scope is not a function");
                        }
                        const expressions = scopeFunction.definition.expressions.map(
                            (expression) => expression.expression
                        );
                        const visibility = assertString(context.getField("visibility"));
                        const scope = context.getField("scope");
                        const [fields, functions] = convertFieldsAndFunctions(expressions);

                        function addEntriesToScope(entries: string[], index: number): void {
                            if (entries.length > 0) {
                                scope.invoke(
                                    [
                                        ...entries.map((entry) => ({
                                            value: new ExecutableConstExpression({
                                                value: context.newString(visibility + entry)
                                            })
                                        })),
                                        {
                                            name: "section",
                                            value: new ExecutableNumberLiteralExpression(undefined, index)
                                        }
                                    ],
                                    context
                                );
                            }
                        }
                        addEntriesToScope(fields, 0);
                        addEntriesToScope(functions, 1);

                        return context.null;
                    },
                    {
                        docs: `
                            Function to take a function in which fields and functions can be declared declaratively.
                            The content of the function is not executed, but analyzed on the AST level.
                            Identifiers can be provided both as identifiers and as strings.
                            A field is defined by an identifier, and optionally a colon and a type identifier.
                            Example: \`x : int\`
                            A function is defined by an identifier, an opening and closing bracket with optional parameters,
                            and optionally a colon and a return type identifier (e.g. test() : int).
                            Parameters are defined like fields, and separated by commas.
                            Example: \`point(x : int, y : int) : Point\`
                        `,
                        params: [[0, "the function which defines the fields and functions", functionType]],
                        returns: "null"
                    }
                )
            ])
        ),
        ...parse(
            `
                scope.internal.propertiesAndMethodsContentHandler = [
                    {
                        this.scope = args.scope
                        scope.public = _classifierEntryScopeGenerator("+ ", scope.section)
                        scope.protected = _classifierEntryScopeGenerator("# ", scope.section)
                        scope.private = _classifierEntryScopeGenerator("- ", scope.section)
                        scope.package = _classifierEntryScopeGenerator("~ ", scope.section)
                        scope.default = _classifierEntryScopeGenerator("", scope.section)
                    },
                    { }
                ]
            `
        )
    ]
);

/**
 * Converts an expression to a string, assuming the expression is either a string literal or an identifier.
 * If the expression is not a string literal or an identifier, an error is thrown.
 *
 * @param expression the expression to convert
 * @returns the string representation of the expression
 */
export function convertStringOrIdentifier(expression: Expression): string {
    if (expression instanceof StringLiteralExpression) {
        return expression.value;
    } else if (expression instanceof IdentifierExpression) {
        return expression.identifier;
    } else {
        throw new RuntimeError("Expression is neither a string nor an identifier", expression);
    }
}

/**
 * Converts an expression to a string, assuming the expression is either a number literal or an identifier.
 * If the expression is not a number literal or an identifier, an error is thrown.
 *
 * @param expression the expression to convert
 * @returns the string representation of the expression
 */
function convertNumberOrIdentifier(expression: Expression): string {
    if (expression instanceof NumberLiteralExpression) {
        return expression.value.toString();
    } else if (expression instanceof IdentifierExpression) {
        return expression.identifier;
    } else {
        throw new RuntimeError("Expression is neither a number nor an identifier", expression);
    }
}

/**
 * Converts a multiplicity element, can either be a string or a range using the '..' operator
 *
 * @param expression the expression to convert
 * @returns the multiplicity element without enclosing square brackets
 */
function convertMultiplicityElement(expression: Expression): string {
    if (expression instanceof StringLiteralExpression) {
        return expression.value;
    } else if (expression instanceof OperatorExpression && isRangeOperator(expression)) {
        const left = expression.left;
        const right = expression.right;
        return convertNumberOrIdentifier(left) + ".." + convertNumberOrIdentifier(right);
    } else {
        throw new RuntimeError("Expected string or range with '..'", expression);
    }
}

/**
 * Converts a type (string or identifier) with an optional multiplicity delared using an index operator
 *
 * @param expression the expression to convert
 * @returns the UML type with multiplicity string
 */
function convertTypeWithOptionalMultiplicity(expression: Expression): string {
    if (expression instanceof IndexExpression) {
        const target = convertStringOrIdentifier(expression.target);
        return `${target} [${convertMultiplicityElement(expression.index)}]`;
    } else {
        return convertStringOrIdentifier(expression);
    }
}

/**
 * Converts a invocation to a UML function string
 *
 * @param expression the expression to convert
 * @returns the UML function string
 */
function convertFunctionInvocation(expression: InvocationExpression): string {
    const identifier = convertStringOrIdentifier(expression.target);
    const args = expression.argumentExpressions
        .filter((argument) => argument.name === undefined)
        .map((argument) => {
            const value = argument.value;
            if (value instanceof OperatorExpression && isColonOperator(value)) {
                const left = value.left;
                const right = value.right;
                return convertStringOrIdentifier(left) + " : " + convertTypeWithOptionalMultiplicity(right);
            } else {
                return convertStringOrIdentifier(value);
            }
        });
    return `${identifier}(${args.join(", ")})`;
}

/**
 * Checks if the operator expression is an operator expression with a colon as operator
 *
 * @param expression the expression to check
 * @returns true if the expression is a colon operator, false otherwise
 */
function isColonOperator(expression: OperatorExpression): boolean {
    return expression.operator instanceof IdentifierExpression && expression.operator.identifier === ":";
}

/**
 * Checks if the operator expression is an operator expression with a range ('..') as operator
 *
 * @param expression the expression to check
 * @returns true if the expression is a range operator, false otherwise
 */
function isRangeOperator(expression: OperatorExpression): boolean {
    return expression.operator instanceof IdentifierExpression && expression.operator.identifier === "..";
}

/**
 * Converts the given expressions to fields and functions
 *
 * @param expressions the expressions to convert
 * @returns the fields and functions
 */
function convertFieldsAndFunctions(expressions: Expression[]): [string[], string[]] {
    const fields: string[] = [];
    const functions: string[] = [];
    for (const expression of expressions) {
        if (expression instanceof OperatorExpression) {
            if (!isColonOperator(expression)) {
                throw new RuntimeError("Unexpected operator", expression);
            }
            const left = expression.left;
            const right = expression.right;
            const type = convertTypeWithOptionalMultiplicity(right);
            if (left instanceof InvocationExpression) {
                functions.push(convertFunctionInvocation(left) + " : " + type);
            } else {
                fields.push(convertStringOrIdentifier(left) + " : " + type);
            }
        } else if (expression instanceof InvocationExpression) {
            functions.push(convertFunctionInvocation(expression));
        } else {
            fields.push(convertStringOrIdentifier(expression));
        }
    }
    return [fields, functions];
}