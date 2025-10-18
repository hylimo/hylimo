import { booleanType, fun, functionType, id, listType, object, optional, str } from "@hylimo/core";
import { PREDICTION_STYLE_CLASS_ASSIGNMENT_EXPRESSION, SCOPE } from "../../../base/dslModule.js";
import { ContentModule } from "../contentModule.js";
import { stringOrSpanListType } from "../../../base/types.js";

/**
 * Module providing the component element
 */
export const componentModule = ContentModule.create(
    "uml/component",
    [
        "uml/classifier/classifier",
        "uml/classifier/componentTitle",
        "uml/classifier/sections",
        "uml/classifier/propertiesAndMethods",
        "uml/classifier/content",
        "uml/classifier/ports",
        "uml/classifier/providesAndRequires"
    ],
    [],
    [
        `
            _component = scope.internal.createClassifier(
                "component",
                list(
                    scope.internal.componentTitleContentHandler,
                    scope.internal.sectionsContentHandler,
                    scope.internal.propertiesAndMethodsContentHandler,
                    scope.internal.contentContentHandler,
                    scope.internal.portsContentHandler,
                    scope.internal.providesRequiresContentHandler
                )
            )
        `,
        id(SCOPE)
            .field("internal")
            .callField(
                "registerClassifier",
                str("component"),
                fun(
                    `
                        (name, callback) = args
                        keywords = list("component")
                        otherKeywords = args.keywords
                        if(otherKeywords != null) {
                            keywords.addAll(otherKeywords)
                        }
                        _component(name, callback, title = name, keywords = keywords, abstract = args.abstract, args = args)
                    `,
                    {
                        docs: "Creates a component.",
                        params: [
                            [0, "the name of the component", stringOrSpanListType],
                            [1, "the function defining the component content", optional(functionType)],
                            ["keywords", "the keywords of the component", optional(listType(stringOrSpanListType))],
                            ["abstract", "whether the component is abstract", optional(booleanType)]
                        ],
                        snippet: `("$1") {\n    $2\n}`,
                        returns: "The created component"
                    }
                ),
                object([
                    {
                        name: "Component/Component",
                        value: str('component("Example")')
                    },
                    {
                        name: "Component/Abstract component",
                        value: str('component("Example", abstract = true)')
                    },
                    {
                        name: "Component/Nested component",
                        value: str(
                            `
                                component("Example") {
                                    component("Inner")
                                }
                            `
                        )
                    },
                    {
                        name: "Component/Component with provided interface",
                        value: str(
                            `
                                component("Example") {
                                    provides("API")' & ${PREDICTION_STYLE_CLASS_ASSIGNMENT_EXPRESSION} & '
                                }
                            `
                        )
                    },
                    {
                        name: "Component/Component with required interface",
                        value: str(
                            `
                                component("Example") {
                                    requires("API")' & ${PREDICTION_STYLE_CLASS_ASSIGNMENT_EXPRESSION} & '
                                }
                            `
                        )
                    }
                ])
            )
    ]
);
