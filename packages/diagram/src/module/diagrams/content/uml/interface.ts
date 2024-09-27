import { fun, functionType, id, InterpreterModule, listType, optional, parse, stringType } from "@hylimo/core";
import { SCOPE } from "../../../base/dslModule.js";

/**
 * Module providing the interface element
 */
export const interfaceModule = InterpreterModule.create(
    "uml/interface",
    [
        "uml/classifier/classifier",
        "uml/classifier/defaultName",
        "uml/classifier/sections",
        "uml/classifier/propertiesAndMethods"
    ],
    [],
    [
        ...parse(
            `
                _classifier = scope.internal.createClassifier(
                    "class",
                    list(
                        scope.internal.defaultNameContentHandler,
                        scope.internal.sectionsContentHandler,
                        scope.internal.propertiesAndMethodsContentHandler
                    )
                )
            `
        ),
        id(SCOPE).assignField(
            "interface",
            fun(
                `
                    (name, callback) = args
                    keywords = list("interface")
                    otherKeywords = args.keywords
                    if(otherKeywords != null) {
                        keywords.addAll(otherKeywords)
                    }
                    scope.internal.registerCanvasElement(
                        _classifier(name, callback, keywords, args.abstract, self = args.self),
                        args,
                        args.self
                    )
                `,
                {
                    docs: "Creates an interface.",
                    params: [
                        [0, "the name of the interface", stringType],
                        [1, "the callback function for the interface", optional(functionType)],
                        ["keywords", "the keywords of the interface", optional(listType(stringType))]
                    ],
                    snippet: `("$1") {\n    $2\n}`,
                    returns: "The created interface"
                }
            )
        ),
    ]
)