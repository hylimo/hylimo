import {
    assign,
    AssignmentExpression,
    ExecutableConstExpression,
    Expression,
    fun,
    FunctionObject,
    functionType,
    IdentifierExpression,
    jsFun,
    num,
    NumberLiteralExpression,
    RuntimeError,
    StringLiteralExpression
} from "@hylimo/core";
import { convertString } from "./propertiesAndMethods.js";
import { ContentModule } from "../../contentModule.js";

/**
 * Module providing the values content handler
 * Requires the sections content handler
 */
export const valuesModule = ContentModule.create(
    "uml/classifier/values",
    [],
    [],
    [
        assign(
            "_valuesScopeGenerator",
            fun([
                `
                    (scope) = args
                `,
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
                                        value: num(0)
                                    }
                                ],
                                context
                            );
                        }

                        return context.null;
                    },
                    {
                        docs: `
                            Takes a function as parameter that declares value specifications through its expressions.
                            The content of the function is not executed, but analyzed on the AST level.
                            A value specification consits of a name (identifier) followed by an equal sign and a value.
                            The value can be a string or number literal, or an identifier.
                            Example: \`hello = "World"\`
                        `,
                        params: [
                            [0, "the function whose expressions will be used as value specifications", functionType]
                        ],
                        returns: "null"
                    }
                )
            ])
        ),
        `
            scope.internal.valuesContentHandler = [
                {
                    args.callScope.values = _valuesScopeGenerator(args.callScope.section)
                },
                { }
            ]
        `
    ]
);

/**
 * Converts the given expressions to value specifications
 *
 * @param expressions the expressions to convert
 * @returns the value specifications
 */
function convertValues(expressions: Expression[]): string[] {
    const values: string[] = [];
    for (const expression of expressions) {
        if (!(expression instanceof AssignmentExpression)) {
            throw new RuntimeError("Only assignments are allowed in value specifications", expression);
        }
        const value = expression.value;
        let valueString: string;
        if (value instanceof StringLiteralExpression) {
            valueString = `"${convertString(value)}"`;
        } else if (value instanceof NumberLiteralExpression) {
            valueString = value.value.toString();
        } else if (value instanceof IdentifierExpression) {
            valueString = value.identifier;
        } else {
            throw new RuntimeError("Only string, number literals and identifiers are allowed as values", value);
        }
        values.push(`${expression.name} = ${valueString}`);
    }
    return values;
}
