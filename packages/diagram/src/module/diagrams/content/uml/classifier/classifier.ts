import { fun, id } from "@hylimo/core";
import { SCOPE } from "../../../../base/dslModule.js";
import { ContentModule } from "../../contentModule.js";

/**
 * Module providing a helper function to create a DSL construct used for e.g. classes and components
 */
export const classifierModule = ContentModule.create(
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
                            canvasScope = classifierArgs.args.self
                            (name, optionalCallback) = args
                            callback = optionalCallback ?? {}
                            result = []

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
                            contentHandlers.forEach {
                                it[0](
                                    callScope = result,
                                    args = classifierArgs,
                                    element = classifierElement,
                                    contents = classifierContents,
                                    canvasScope = canvasScope
                                )
                            }

                            scope.internal.registerCanvasElement(
                                classifierElement,
                                classifierArgs.args,
                                canvasScope
                            )
                            scope.internal.registerInDiagramScope(name, classifierElement)

                            callback.callWithScope(result)

                            contentHandlers.forEach {
                                it[1](
                                    callScope = result,
                                    args = classifierArgs,
                                    element = classifierElement,
                                    contents = classifierContents,
                                    canvasScope = classifierArgs.self
                                )
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
        `
            scope.styles {
                cls("classifier-element") {
                    vAlign = "center"
                    hAlign = "center"
                    minWidth = 300

                    cls("classifier") {
                        type("vbox") {
                            margin = 5
                        }
                    }
                    cls("separator") {
                        marginTop = 5
                        marginBottom = 5
                        marginLeft = -5
                        marginRight = -5
                    }
                    cls("abstract") {
                        cls("title") {
                            cls("title") {
                                fontStyle = "italic"
                            }
                        }
                    }
                    cls("title") {
                        hAlign = "center"
                        cls("title") {
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
    ]
);
