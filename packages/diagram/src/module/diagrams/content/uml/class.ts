import { fun, functionType, id, InterpreterModule, listType, optional, parse, stringType } from "@hylimo/core";
import { SCOPE } from "../../../base/dslModule.js";

/**
 * Module providing the class element
 */
export const classModule = InterpreterModule.create(
    "uml/class",
    [
        "uml/classifier/classifier",
        "uml/classifier/defaultName",
        "uml/classifier/sections",
        "uml/classifier/propertiesAndMethods",
        "uml/classifier/content",
        "uml/classifier/ports"
    ],
    [],
    [
        ...parse(
            `
                _class = scope.internal.createClassifier(
                    "class",
                    list(
                        scope.internal.defaultNameContentHandler,
                        scope.internal.sectionsContentHandler,
                        scope.internal.propertiesAndMethodsContentHandler,
                        scope.internal.contentContentHandler,
                        scope.internal.portsContentHandler
                    )
                )
            `
        ),
        id(SCOPE).assignField(
            "class",
            fun(
                `
                    (name, callback) = args
                    scope.internal.registerCanvasElement(
                        _class(name, callback, args.keywords, args.abstract, self = args.self),
                        args,
                        args.self
                    )
                `,
                {
                    docs: "Creates a class.",
                    params: [
                        [0, "the name of the class", stringType],
                        [1, "the callback function for the class", optional(functionType)],
                        ["keywords", "the keywords of the class", optional(listType(stringType))]
                    ],
                    snippet: `("$1") {\n    $2\n}`,
                    returns: "The created class"
                }
            )
        )
    ]
);
