import { fun, functionType, id, InterpreterModule, listType, optional, or, stringType } from "@hylimo/core";
import { SCOPE } from "../../../base/dslModule.js";

/**
 * Module providing the UML 'instance' function for object/sequence diagrams
 */
export const instanceModule = InterpreterModule.create(
    "uml/instance",
    [
        "uml/classifier/classifier",
        "uml/classifier/defaultTitle",
        "uml/classifier/sections",
        "uml/classifier/propertiesAndMethods",
        "uml/classifier/content"
    ],
    [],
    [
        `
        scope.internal.createInstance = scope.internal.createClassifier(
            "instance",
            list(
                scope.internal.defaultTitleContentHandler,
                scope.internal.sectionsContentHandler,
                scope.internal.propertiesAndMethodsContentHandler,
                scope.internal.contentContentHandler
            )
        )
        `,
        id(SCOPE).assignField(
            "instance",
            fun(
                `
                    (name, class, callback) = args
                    title = name
                    if(class != null) {
                        title = name + ":" + class
                    }
                    scope.internal.createInstance(name, callback, title = title, keywords = args.keywords, args = args)
                `,
                {
                    docs: "Creates an instance.",
                    params: [
                        [
                            0,
                            "the optional name of the instance. If the next argument is missing, this argument will be treated as the class name",
                            stringType
                        ],
                        [1, "the class name of this instance", optional(or(stringType, functionType))], // TODO: Shift $1 to $2 if necessary
                        [2, "the callback function of this instance", optional(functionType)],
                        ["keywords", "the keywords of the class", optional(listType(stringType))]
                    ],
                    snippet: `("$1") {\n    $2\n}`,
                    returns: "The created class"
                }
            )
        )
    ]
);
