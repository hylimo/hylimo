import { fun, functionType, id, InterpreterModule, listType, optional, parse, stringType } from "@hylimo/core";
import { SCOPE } from "../../../base/dslModule.js";

/**
 * Module providing the UML 'instance' function for object/sequence diagrams
 */
export const instanceModule = InterpreterModule.create(
    "uml/class",
    [
        "uml/classifier/classifier",
        "uml/classifier/defaultTitle",
        "uml/classifier/sections",
        "uml/classifier/propertiesAndMethods",
        "uml/classifier/content"
    ],
    [],
    [
        ...parse(
            `
                _instance = scope.internal.createClassifier(
                    "instance",
                    list(
                        scope.internal.defaultTitleContentHandler,
                        scope.internal.sectionsContentHandler,
                        scope.internal.propertiesAndMethodsContentHandler,
                        scope.internal.contentContentHandler
                    )
                )
            `
        ),
        id(SCOPE).assignField(
            "instance",
            fun(
                `
                    (name, class, callback) = args
                    title = name
                    if(class != null) {
                        title = name + ":" + class
                    }
                    _instance(name, callback, title = title, keywords = args.keywords, args = args)
                `,
                {
                    docs: "Creates an instance.",
                    params: [
                        [
                            0,
                            "the optional name of the instance. If the next argument is missing, this argument will be treated as the class name",
                            stringType
                        ],
                        [1, "the class name of this instance", optional(stringType)],
                        [2, "the callback function of this instance", optional(functionType)],
                        ["keywords", "the keywords of the class", optional(listType(stringType))]
                    ],
                    snippet: `("$1") {\n    $2\n}`,
                    returns: "The created class"
                }
            )
        ),
        ...parse(
            `
                scope.styles {
                    cls("instance-element") {
                        vAlign = "bottom"
                    }
                }
            `
        )
    ]
);
