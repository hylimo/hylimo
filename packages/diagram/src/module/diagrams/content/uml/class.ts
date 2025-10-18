import { booleanType, fun, functionType, id, listType, object, optional, str } from "@hylimo/core";
import { SCOPE } from "../../../base/dslModule.js";
import { ContentModule } from "../contentModule.js";
import { stringOrSpanListType } from "../../../base/types.js";

/**
 * Module providing the UML class model element
 */
export const classModule = ContentModule.create(
    "uml/class",
    [
        "uml/classifier/classifier",
        "uml/classifier/defaultTitle",
        "uml/classifier/sections",
        "uml/classifier/propertiesAndMethods",
        "uml/classifier/content",
        "uml/classifier/ports"
    ],
    [],
    [
        `
            _class = scope.internal.createClassifier(
                "class",
                list(
                    scope.internal.defaultTitleContentHandler,
                    scope.internal.sectionsContentHandler,
                    scope.internal.propertiesAndMethodsContentHandler,
                    scope.internal.contentContentHandler,
                    scope.internal.portsContentHandler
                )
            )
        `,
        id(SCOPE)
            .field("internal")
            .callField(
                "registerClassifier",
                str("class"),
                fun(
                    `
                        (name, callback) = args
                        _class(name, callback, title = name, keywords = args.keywords, abstract = args.abstract, args = args)
                    `,
                    {
                        docs: "Creates a class.",
                        params: [
                            [0, "the name of the class", stringOrSpanListType],
                            [1, "the callback function for the class", optional(functionType)],
                            ["keywords", "the keywords of the class", optional(listType(stringOrSpanListType))],
                            ["abstract", "whether the class is abstract", optional(booleanType)]
                        ],
                        snippet: `("$1") {\n    $2\n}`,
                        returns: "The created class"
                    }
                ),
                object([
                    {
                        name: "Class/Class",
                        value: str('class("Example")')
                    },
                    {
                        name: "Class/Abstract class",
                        value: str('class("Example", abstract = true)')
                    },
                    {
                        name: "Class/Class with properties",
                        value: str(
                            `
                                class("Example") {
                                    public {
                                        name : string
                                    }
                                    private {
                                        test() : void
                                    }
                                }
                            `
                        )
                    },
                    {
                        name: "Class/Nested class",
                        value: str(
                            `
                                class("Example") {
                                    class("Inner")
                                }
                            `
                        )
                    },
                    {
                        name: "Class/Nested class with properties",
                        value: str(
                            `
                                class("Example") {

                                    public {
                                        name : string
                                        test() : void
                                    }
                                    
                                    class("Inner")
                                }
                            `
                        )
                    }
                ])
            )
    ]
);
