import {
    booleanType,
    fun,
    functionType,
    id,
    InterpreterModule,
    listType,
    optional,
    parse,
    stringType
} from "@hylimo/core";
import { SCOPE } from "../../../base/dslModule.js";

/**
 * Module providing the component element
 */
export const componentModule = InterpreterModule.create(
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
        ...parse(
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
            `
        ),
        id(SCOPE).assignField(
            "component",
            fun(
                `
                    (name, callback) = args
                    keywords = list("component")
                    otherKeywords = args.keywords
                    if(otherKeywords != null) {
                        keywords.addAll(otherKeywords)
                    }
                    _component(name, callback, keywords = keywords, abstract = args.abstract, args = args)
                `,
                {
                    docs: "Creates a component.",
                    params: [
                        [0, "the name of the component", stringType],
                        [1, "the function defining the component content", optional(functionType)],
                        ["keywords", "the keywords of the component", optional(listType(stringType))],
                        ["abstract", "whether the component is abstract", optional(booleanType)]
                    ],
                    snippet: `("$1") {\n    $2\n}`,
                    returns: "The created component"
                }
            )
        )
    ]
);
