import { fun, functionType, id, InterpreterModule, listType, optional, parse, stringType } from "@hylimo/core";
import { SCOPE } from "../../../base/dslModule.js";

/**
 * Module providing the enum element
 */
export const enumModule = InterpreterModule.create(
    "uml/enum",
    [
        "uml/classifier/classifier",
        "uml/classifier/defaultName",
        "uml/classifier/sections",
        "uml/classifier/propertiesAndMethods",
        "uml/classifier/entries"
    ],
    [],
    [
        ...parse(
            `
                _enum = scope.internal.createClassifier(
                    "enum",
                    list(
                        scope.internal.defaultNameContentHandler,
                        scope.internal.sectionsContentHandler,
                        scope.internal.propertiesAndMethodsContentHandler,
                        scope.internal.entriesContentHandler
                    )
                )
            `
        ),
        id(SCOPE).assignField(
            "enum",
            fun(
                `
                    (name, callback) = args
                    keywords = list("enumeration")
                    otherKeywords = args.keywords
                    if(otherKeywords != null) {
                        keywords.addAll(otherKeywords)
                    }
                    scope.internal.registerCanvasElement(
                        _enum(name, callback, keywords, args.abstract, self = args.self, hasEntries = true),
                        args,
                        args.self
                    )
                `,
                {
                    docs: "Creates an enum.",
                    params: [
                        [0, "the name of the enum", stringType],
                        [1, "the callback function for the enum", optional(functionType)],
                        ["keywords", "the keywords of the enum", optional(listType(stringType))]
                    ],
                    snippet: `("$1") {\n    entries {\n        $2\n    }\n}`,
                    returns: "The created enum"
                }
            )
        )
    ]
);
