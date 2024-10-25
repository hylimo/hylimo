import {
    assertString,
    assign,
    AssignmentExpression,
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
 * Module providing the values content handler
 * Requires the sections content handler
 */
export const valuesModule = InterpreterModule.create(
    "uml/classifier/values",
    [],
    [],
    [
        assign(
            "_valuesScopeGenerator",
            fun([
                ...parse(
                    `
                        (scope) = args
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
                        const scope = context.getField("scope");
                        const values = convertValues(expressions);

                        if (values.length > 0) {
                            scope.invoke(
                                [
                                    ...values.map((entry) => ({
                                        value: new ExecutableConstExpression({
                                            value: context.newString(entry)
                                        })
                                    })),
                                    {
                                        name: "section",
                                        value: new ExecutableNumberLiteralExpression(undefined, 2)
                                    }
                                ],
                                context
                            );
                        }

                        return context.null;
                    },
                    {
                        docs: `
                            Takes a function as parameter that declares values through its expressions.
                            The content of the function is not executed, but analyzed on the AST level.
                            Enum literals can be provided using assignments, where the value is on the right side
                            Example: \`message = "Hello world"\`
                        `,
                        params: [[0, "the function whose expressions will be used as values", functionType]],
                        returns: "null"
                    }
                )
            ])
        ),
        ...parse(
            `
                scope.internal.valuesContentHandler = [
                    {
                        args.scope.values = _valuesScopeGenerator(args.scope.section)
                    },
                    { }
                ]
            `
        )
    ]
);


/**
 * Converts the given expressions to enum literals
 *
 * @param expressions the expressions to convert
 * @returns the enum literals
 */
function convertValues(expressions: Expression[]): string[] {
    const values: string[] = [];
    for (const expression of expressions) {
        values.push(convertValue(expression));
    }
    return values;
}

function convertValue(expression: Expression): string {
    if (expression instanceof AssignmentExpression) {
        return expression.name + " = " + convertValueValue(expression.value);
    } else {
        throw new RuntimeError("Expected assignment expression", expression);
    }
}


export function convertValueValue(expression: Expression): string {
    if (expression instanceof StringLiteralExpression) {
        return `"${expression.value}"`;
    } else if (expression instanceof NumberLiteralExpression) {
        return expression.value.toString();
    } else if (expression instanceof IdentifierExpression) {
        return expression.identifier;
    } else {
        throw new RuntimeError("Expression is neither a string, number, nor an identifier", expression);
    }
}
