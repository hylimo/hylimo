import { fun, functionType, id, InterpreterModule, listType, optional, or, stringType } from "@hylimo/core";
import { createToolboxEdit, SCOPE } from "../../../base/dslModule.js";

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
                        if(class.proto == "".proto) {
                            title = name + ":" + class
                        } 
                    } {
                        if(callback != null) {
                            error("Both the class name and body of instance '\${name}' are set to functions which is not allowed. Either provide a class name string as second argument, or pass at most two arguments")
                        }
                        callback = class // shift $1 -> $2 when necessary, both the class name and the callback function are optional
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
                        [1, "the class name of this instance", optional(or(stringType, functionType))],
                        [2, "the callback function of this instance", optional(functionType)],
                        ["keywords", "the keywords of the class", optional(listType(stringType))]
                    ],
                    snippet: `("$1") {\n    $2\n}`,
                    returns: "The created class"
                }
            )
        ),
        createToolboxEdit("Instance/Instance", 'instance("Example")'),
        createToolboxEdit("Instance/Instance with name", 'instance("example", "Example")'),
    ]
);
