import type { Expression } from "@hylimo/core";
import {
    AssignmentExpression,
    functionType,
    IdentifierExpression,
    NumberLiteralExpression,
    RuntimeError,
    StringLiteralExpression
} from "@hylimo/core";
import { convertString } from "./propertiesAndMethods.js";
import { createClassifierScopeContentModule } from "./classifierScope.js";

/**
 * Module providing the values content handler
 * Requires the sections content handler
 */
export const valuesModule = createClassifierScopeContentModule<undefined>(
    "uml/classifier(values",
    "valuesContentHandler",
    [
        {
            name: "values",
            docs: {
                docs: `
                            Takes a function as parameter that declares value specifications through its expressions.
                            The content of the function is not executed, but analyzed on the AST level.
                            A value specification consits of a name (identifier) followed by an equal sign and a value.
                            The value can be a string or number literal, or an identifier.
                            Example: \`hello = "World"\`
                        `,
                params: [[0, "the function whose expressions will be used as value specifications", functionType]],
                returns: "null"
            },
            edits: [
                {
                    value: "example = 10",
                    name: "Value/Add integer value"
                },
                {
                    value: 'example = "Hello"',
                    name: "Value/Add string value"
                },
                {
                    value: "example = identifier",
                    name: "Value/Add identifier value"
                }
            ],
            extractContext: () => undefined,
            parseEntries: (parseContext, expressions, context) => {
                return [
                    {
                        values: convertValues(expressions).map((value) => ({
                            value: context.newString(value),
                            source: undefined
                        })),
                        index: 0
                    }
                ];
            }
        }
    ],
    []
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
