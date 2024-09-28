import { fun, id, InterpreterModule, parse } from "@hylimo/core";
import { SCOPE } from "../../../../base/dslModule.js";

/**
 * Module poviding a helper function to create a DSL construct used for e.g. classes and components
 */
export const classifierModule = InterpreterModule.create(
    "uml/classifier/classifier",
    [],
    [],
    [
        id(SCOPE)
            .field("internal")
            .assignField(
                "createClassifier",
                fun(
                    `
                        (type, contentHandlers) = args
                        {
                            classifierArgs = args
                            (name, optionalCallback) = args
                            callback = optionalCallback ?? {}
                            result = []
                            
                            contentHandlers.forEach {
                                it[0](scope = result, args = classifierArgs)
                            }

                            callback.callWithScope(result)

                            classifierContents = list()
                            renderedClassifier = rect(
                                class = list("classifier", type),
                                content = vbox(contents = classifierContents)
                            )
                            if(classifierArgs.abstract == true) {
                                renderedClassifier.class += "abstract"
                            }
                            classifierElement = canvasElement(
                                content = renderedClassifier,
                                class = list("classifier-element", type + "-element")
                            )

                            targetScope = args.self
                            scope.internal.registerInDiagramScope(name, classifierElement)

                            contentHandlers.forEach {
                                it[1](scope = result, args = classifierArgs, element = classifierElement, contents = classifierContents)
                            }

                            classifierElement
                        }
                    `,
                    {
                        docs: `
                            Creates a function that creates a classifier, e.g. a class or component.
                            The resulting function always takes one or two positional arguments:
                            The name of the classifier, and a function that is immediately called (if provided).
                            The function usually provides the content of the classifier, e.g. properties and methods.
                            The classifier is customizable by providing content handlers to this function.
                            Each content handler is a tuple of two functions: the first is provided with the scope
                            of the content function, and can enhance it, e.g. with additional functions.
                            The second function is called after the content function has executed, and creates
                            the actual content of the classifier. Note that this function is called even
                            if the content function is not provided.
                        `,
                        params: [
                            [0, "The type of the classifier, e.g. class"],
                            [1, "The content handlers, e.g. for properties and methods"]
                        ],
                        returns: "A function that creates a classifier."
                    }
                )
            ),
        ...parse(
            `
                scope.styles {
                    cls("classifier-element") {
                        vAlign = "center"
                        hAlign = "center"
                        minWidth = 300

                        cls("classifier") {
                            stroke = var("primary")
                            strokeWidth = var("strokeWidth")
                            type("vbox") {
                                margin = 5
                            }
                        }
                        cls("separator") {
                            marginTop = 5
                            marginBottom = 5
                            marginLeft = -5
                            marginRight = -5
                            strokeWidth = var("strokeWidth")
                            stroke = var("primary")
                        }
                        cls("abstract") {
                            cls("title") {
                                type("span") {
                                    fontStyle = "italic"
                                }
                            }
                        }
                        cls("title") {
                            hAlign = "center"
                            type("span") {
                                fontWeight = "bold"
                            }
                        }
                        cls("keyword") {
                            hAlign = "center"
                        }
                        cls("classifier-canvas") {
                            margin = var("subcanvasMargin")
                        }
                    }
                }
            `
        )
    ]
);
