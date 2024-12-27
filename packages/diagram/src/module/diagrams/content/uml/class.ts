import { booleanType, fun, functionType, id, InterpreterModule, listType, optional, stringType } from "@hylimo/core";
import { createToolboxEdit, SCOPE } from "../../../base/dslModule.js";

/**
 * Module providing the UML class model element
 */
export const classModule = InterpreterModule.create(
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
        id(SCOPE).assignField(
            "class",
            fun(
                `
                    (name, callback) = args
                    _class(name, callback, keywords = args.keywords, abstract = args.abstract, args = args)
                `,
                {
                    docs: "Creates a class.",
                    params: [
                        [0, "the name of the class", stringType],
                        [1, "the callback function for the class", optional(functionType)],
                        ["keywords", "the keywords of the class", optional(listType(stringType))],
                        ["abstract", "whether the class is abstract", optional(booleanType)]
                    ],
                    snippet: `("$1") {\n    $2\n}`,
                    returns: "The created class"
                }
            )
        ),
        createToolboxEdit("Class/Class", 'class("Example")'),
        createToolboxEdit("Class/Abstract class", 'class("Example", abstract = true)'),
        createToolboxEdit(
            "Class/Class with properties",
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
        ),
        createToolboxEdit(
            "Class/Nested class",
            `
                class("Example") {
                    class("Inner")
                }
            `
        ),
        createToolboxEdit(
            "Class/Nested class with properties",
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
    ]
);
