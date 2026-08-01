import type { Expression } from "@hylimo/core";
import { functionType } from "@hylimo/core";
import { convertStringOrIdentifier } from "../classifier/propertiesAndMethods.js";
import { createClassifierScopeContentModule } from "../classifier/classifierScope.js";

/**
 * The label UML prints above the extension points of a use case. It is part of the notation, not a
 * caption of our own, which is why it is emitted with the points rather than styled onto the
 * compartment: a use case without extension points has no such compartment at all.
 */
const EXTENSION_POINTS_LABEL = "extension points";

/**
 * The compartment the label and the points share. A use case draws them under one separator, so they
 * have to end up in one section; the index is the one the enum literals use, as neither element ever
 * has both.
 */
const EXTENSION_POINTS_SECTION = 2;

/**
 * Module providing the extension points content handler.
 * Requires the sections content handler.
 */
export const extensionPointsModule = createClassifierScopeContentModule<undefined>(
    "uml/usecase/extensionPoints",
    "extensionPointsContentHandler",
    [
        {
            name: "extensionPoints",
            docs: {
                docs: `
                    Takes a function as parameter that declares the extension points of a use case
                    through its expressions.
                    The content of the function is not executed, but analyzed on the AST level.
                    Extension points can be provided both as identifiers and as strings.
                    Example: \`Invalid payment\`
                `,
                params: [[0, "the function whose expressions will be used as extension points", functionType]],
                returns: "null"
            },
            edits: [
                {
                    value: "ExampleExtensionPoint",
                    name: "Extension point/Add extension point"
                }
            ],
            extractContext: () => undefined,
            parseEntries: (parseContext, expressions, context) => {
                const points = convertExtensionPoints(expressions);
                if (points.length === 0) {
                    return [];
                }
                return [
                    {
                        values: [EXTENSION_POINTS_LABEL, ...points].map((entry) => ({
                            value: context.newString(entry),
                            source: undefined
                        })),
                        index: EXTENSION_POINTS_SECTION
                    }
                ];
            }
        }
    ],
    []
);

/**
 * Converts the given expressions to extension points
 *
 * @param expressions the expressions to convert
 * @returns the extension points
 */
function convertExtensionPoints(expressions: Expression[]): string[] {
    return expressions.map((expression) => convertStringOrIdentifier(expression));
}
