import { booleanType, fun, functionType, id, listType, object, optional, or, str } from "@hylimo/core";
import { SCOPE } from "../../../base/dslModule.js";
import { ContentModule } from "../contentModule.js";
import { stringOrSpanListType } from "../../../base/types.js";

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
                        keywords = scope.internal.resolveKeywords("enumeration", args)
                        _enum(name, callback, title = name, keywords = keywords, abstract = args.abstract, args = args, hasEntries = true)
                    `,
                    {
                        docs: "Creates an enum.",
                        params: [
                            [0, "the name of the enum", stringOrSpanListType],
                            [1, "the function declaring the enum constants", optional(functionType)],
                            [
                                "keyword",
                                "replaces the «enumeration» keyword, false hides it",
                                optional(or(stringOrSpanListType, booleanType))
                            ],
                            [
                                "keywords",
                                "the additional keywords of the enum",
                                optional(listType(stringOrSpanListType))
                            ],
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
                            `
                        )
                    }
                ])
            )
    ]
);
