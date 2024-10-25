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
 * Module providing the interface element
 */
export const interfaceModule = InterpreterModule.create(
    "uml/interface",
    [
        "uml/classifier/classifier",
        "uml/classifier/defaultTitle",
        "uml/classifier/sections",
        "uml/classifier/propertiesAndMethods"
    ],
    [],
    [
        ...parse(
            `
                _interface = scope.internal.createClassifier(
                    "interface",
                    list(
                        scope.internal.defaultTitleContentHandler,
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
                    _interface(name, callback, title = name, keywords = keywords, abstract = args.abstract, args = args)
                `,
                {
                    docs: "Creates an interface.",
                    params: [
                        [0, "the name of the interface", stringType],
                        [1, "the callback function for the interface", optional(functionType)],
                        ["keywords", "the keywords of the interface", optional(listType(stringType))],
                        ["abstract", "whether the interface is abstract", optional(booleanType)]
                    ],
                    snippet: `("$1") {\n    $2\n}`,
                    returns: "The created interface"
                }
            )
        )
    ]
);
