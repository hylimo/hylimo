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
                    if(class.proto == "".proto) {
                        title = name + ":" + class
                    }
                    _instance(name, callback, title = title, keywords = args.keywords, args = args)
                `,
                {
                    docs: "Creates a instance.",
                    params: [
                        [0, "the optional name of the instance. If it is missing, it will be treated as the class name", stringType],
                        [1, "the class name of this instance", optional(stringType)],
                        ["keywords", "the keywords of the class", optional(listType(stringType))]
                    ],
                    snippet: `("$1") {\n    $2\n}`,
                    returns: "The created class"
                }
            )
        )
    ]
);
