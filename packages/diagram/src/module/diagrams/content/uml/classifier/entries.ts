import type { Expression } from "@hylimo/core";
import { functionType } from "@hylimo/core";
import { convertStringOrIdentifier } from "./propertiesAndMethods.js";
import { createClassifierScopeContentModule } from "./classifierScope.js";

/**
 * Module providing the entries content handler
 * Requires the sections content handler
 */
export const entriesModule = createClassifierScopeContentModule<undefined>(
    "uml/classifier/entries",
    "entriesContentHandler",
    [
        {
            name: "entries",
            docs: {
                docs: `
                    Takes a function as parameter that declares enum literals through its expressions.
                    The content of the function is not executed, but analyzed on the AST level.
                    Enum literals can be provided both as identifiers and as strings.
                    Example: \`ENUM_ENTRY\`
                `,
                params: [[0, "the function whose expressions will be used as enum literals", functionType]],
                returns: "null"
            },
            edits: [
                {
                    value: "EXAMPLE",
                    name: "Entry/Add entry"
                }
            ],
            extractContext: () => undefined,
            parseEntries: (parseContext, expressions, context) => {
                return [
                    {
                        values: convertEnumLiterals(expressions).map((entry) => ({
                            value: context.newString(entry),
                            source: undefined
                        })),
                        index: 2
                    }
                ];
            }
        }
    ],
    []
);

/**
 * Converts the given expressions to enum literals
 *
 * @param expressions the expressions to convert
 * @returns the enum literals
 */
function convertEnumLiterals(expressions: Expression[]): string[] {
    const literals: string[] = [];
    for (const expression of expressions) {
        literals.push(convertStringOrIdentifier(expression));
    }
    return literals;
}
