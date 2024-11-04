import { InterpreterModule, parse } from "@hylimo/core";

/**
 * Module providing the content content handler (creates a subcanvas if required)
 */
export const contentModule = InterpreterModule.create(
    "uml/classifier/content",
    [],
    [],
    [
        ...parse(
            `
                scope.internal.contentContentHandler = [
                    {
                        args.callScope.contents = list()
                    },
                    {
                        this.innerContents = args.callScope.contents
                        this.contents = args.contents
                        if (innerContents.length > 0) {
                            this.innerCanvasClass = list()
                            if(innerContents.some { (it.type == "canvasElement") || (it.type == "canvasConnection") }) {
                                contents += path(path = "M 0 0 L 1 0", class = list("separator"))
                                innerCanvasClass += "classifier-canvas"
                            }
                            contents += canvas(
                                contents = innerContents,
                                class = innerCanvasClass
                            )
                        }
                    }
                ]
            `
        )
    ]
);
