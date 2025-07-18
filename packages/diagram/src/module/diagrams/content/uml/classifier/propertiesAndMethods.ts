import type {
    BaseObject,
    ExecutableListEntry,
    Expression,
    FunctionDocumentation,
    InterpreterContext,
    LabeledValue
} from "@hylimo/core";
import {
    assertBoolean,
    booleanType,
    ExecutableConstExpression,
    functionType,
    IdentifierExpression,
    IndexExpression,
    InvocationExpression,
    NumberLiteralExpression,
    OperatorExpression,
    optional,
    RuntimeError,
    str,
    StringLiteralExpression
} from "@hylimo/core";
import { createClassifierScopeContentModule, type ClassifierScopeSpecification } from "./classifierScope.js";

/**
 * Context used for parsing the properties and methods content.
 */
interface ParseContext {
    /**
     * Indicates if the scope is marked as static.
     */
    static: boolean;
    /**
     * Indicates if the scope is marked as abstract.
     */
    abstract: boolean;
    /**
     * Function to create a list object.
     */
    list: (values: LabeledValue[], context: InterpreterContext) => LabeledValue;
    /**
     * Function to create a span object with the given text and optional class.
     */
    span: (text: string, cls: string[] | undefined, context: InterpreterContext) => LabeledValue;
}

/**
 * Documentation for the scope functions (public, protected, private, package, default)
 */
const scopeDocs: FunctionDocumentation = {
    docs: `
        Takes a function as paramater that declares fields and functions though its expressions.
        The content of the function is not executed, but analyzed on the AST level.
        Identifiers can be provided both as identifiers and as strings.
        A field is defined by an identifier, and optionally a colon and a type identifier.
        Example: \`x : int\`
        A function is defined by an identifier, an opening and closing bracket with optional parameters,
        and optionally a colon and a return type identifier (e.g. test() : int).
        Parameters are defined like fields, and separated by commas.
        Example: \`point(x : int, y : int) : Point\`.
        Use newlines to separate fields and functions.
    `,
    params: [
        [0, "the function which defines the fields and functions", functionType],
        ["abstract", "if true, the entry is marked as abstract", optional(booleanType)],
        ["static", "if true, the entry is marked as static", optional(booleanType)]
    ],
    returns: "null"
};

/**
 * Specifications for the classifier scope content handler for properties and methods.
 */
const scopeSpecifications: ClassifierScopeSpecification<ParseContext>[] = [
    ["public", "+ "],
    ["protected", "# "],
    ["private", "- "],
    ["package", "~ "],
    ["default", ""]
].map(([name, visibility]) => {
    const edits: ClassifierScopeSpecification<any>["edits"] = [];
    if (name !== "default") {
        edits.push(
            {
                value: "example : string",
                name: `Property/Add ${name} property`
            },
            {
                value: "example(param: string) : int",
                name: `Function/Add ${name} function`
            }
        );
    }
    return {
        name,
        docs: scopeDocs,
        edits,
        extractContext: (context, args) => {
            const isAbstractRaw = args.getLocalFieldOrUndefined("abstract");
            const isStaticRaw = args.getLocalFieldOrUndefined("static");
            const isAbstract = isAbstractRaw != undefined ? assertBoolean(isAbstractRaw.value) : false;
            const isStatic = isStaticRaw != undefined ? assertBoolean(isStaticRaw.value) : false;
            let listFunction: BaseObject | undefined;
            let spanFunction: BaseObject | undefined;
            if (isAbstract || isStatic) {
                listFunction = context.getField("list");
                spanFunction = context.getField("span");
            }

            return {
                static: isStatic,
                abstract: isAbstract,
                list: (values, context) =>
                    listFunction!.invoke(
                        values.map((value) => ({
                            value: new ExecutableConstExpression(value)
                        })),
                        context,
                        undefined,
                        undefined
                    ),
                span: (text, cls, context) => {
                    const args: ExecutableListEntry[] = [{ value: str(text), name: "text" }];
                    if (cls != undefined) {
                        args.push({
                            value: new ExecutableConstExpression(
                                listFunction!.invoke(
                                    cls.map((c) => ({ value: str(c) })),
                                    context,
                                    undefined,
                                    undefined
                                )
                            ),
                            name: "class"
                        });
                    }
                    return spanFunction!.invoke(args, context, undefined, undefined);
                }
            };
        },
        parseEntries: (parseContext, expressions, context) => {
            const [fields, functions] = convertFieldsAndFunctions(expressions);
            function modifyEntry(entry: string): LabeledValue {
                if (parseContext.static || parseContext.abstract) {
                    const cls: string[] = [];
                    if (parseContext.abstract) {
                        cls.push("entry-abstract");
                    }
                    if (parseContext.static) {
                        cls.push("entry-static");
                    }
                    return parseContext.list(
                        [parseContext.span(visibility, undefined, context), parseContext.span(entry, cls, context)],
                        context
                    );
                }
                return {
                    value: context.newString(visibility + entry),
                    source: undefined
                };
            }

            return [
                {
                    values: fields.map((field) => modifyEntry(field)),
                    index: 0
                },
                {
                    values: functions.map((func) => modifyEntry(func)),
                    index: 1
                }
            ];
        }
    };
});

/**
 * Module providing the properties and methods content handler
 * Requires the sections content handler
 */
export const propertiesAndMethodsModule = createClassifierScopeContentModule<ParseContext>(
    "uml/classifier/propertiesAndMethods",
    "propertiesAndMethodsContentHandler",
    scopeSpecifications,
    [
        `
        scope.styles {
                type("text") {
                    cls("entry-abstract") {
                        fontStyle = "italic"
                    }
                    cls("entry-static") {
                        underline = true
                    }
                }
            }
        `
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
        return convertString(expression);
    } else if (expression instanceof IdentifierExpression) {
        return expression.identifier;
    } else {
        throw new RuntimeError("Expression is neither a string nor an identifier", expression);
    }
}

/**
 * Converts a string literal expression to a string
 * If the expression uses string template expressions, an error is thrown.
 *
 * @param expression the expression to convert
 * @returns the string representation of the expression
 */
export function convertString(expression: StringLiteralExpression): string {
    if (expression.parts.length > 1 || !("content" in expression.parts[0])) {
        throw new RuntimeError("String template expressions are not supported here", expression);
    }
    return expression.parts[0]?.content ?? "";
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
 * Converts a multiplicity element, can either be a string, identifier, number, or a range using the '..' operator
 *
 * @param expression the expression to convert
 * @returns the multiplicity element without enclosing square brackets
 */
function convertMultiplicityElement(expression: Expression): string {
    if (expression instanceof StringLiteralExpression) {
        return convertString(expression);
    } else if (expression instanceof IdentifierExpression || expression instanceof NumberLiteralExpression) {
        return convertNumberOrIdentifier(expression);
    } else if (expression instanceof OperatorExpression && isRangeOperator(expression)) {
        const left = expression.left;
        const right = expression.right;
        return convertNumberOrIdentifier(left) + ".." + convertNumberOrIdentifier(right);
    } else {
        throw new RuntimeError("Expected string, number, identifier, or range with '..'", expression);
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
 * Converts an invocation to a UML function string
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
