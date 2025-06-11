import { booleanType, fun, functionType, id, listType, object, optional, str, stringType } from "@hylimo/core";
import { SCOPE } from "../../../base/dslModule.js";
import { ContentModule } from "../contentModule.js";

/**
 * Module providing the enum element
 */
export const enumModule = ContentModule.create(
    "uml/enum",
    [
        "uml/classifier/classifier",
        "uml/classifier/defaultTitle",
        "uml/classifier/sections",
        "uml/classifier/propertiesAndMethods",
        "uml/classifier/entries"
    ],
    [],
    [
        `
            _enum = scope.internal.createClassifier(
                "enum",
                list(
                    scope.internal.defaultTitleContentHandler,
                    scope.internal.sectionsContentHandler,
                    scope.internal.propertiesAndMethodsContentHandler,
                    scope.internal.entriesContentHandler
                )
            )
        `,
        id(SCOPE)
            .field("internal")
            .callField(
                "registerClassifier",
                str("enum"),
                fun(
                    `
                        (name, callback) = args
                        keywords = list("enumeration")
                        otherKeywords = args.keywords
                        if(otherKeywords != null) {
                            keywords.addAll(otherKeywords)
                        }
                        _enum(name, callback, title = name, keywords = keywords, abstract = args.abstract, args = args, hasEntries = true)
                    `,
                    {
                        docs: "Creates an enum.",
                        params: [
                            [0, "the name of the enum", stringType],
                            [1, "the function declaring the enum constants", optional(functionType)],
                            ["keywords", "the keywords of the enum", optional(listType(stringType))],
                            ["abstract", "whether the enum is abstract", optional(booleanType)]
                        ],
                        snippet: `("$1") {\n    entries {\n        $2\n    }\n}`,
                        returns: "The created enum"
                    }
                ),
                object([
                    {
                        name: "Enum/Enum",
                        value: str('enum("Example")')
                    },
                    {
                        name: "Enum/Enum with entries",
                        value: str(
                            `
                                enum("Example") {
                                    entries {
                                        A
                                        B
                                    }
                                    }
                                }
                            `
                        )
                    }
                ])
            )
    ]
);
