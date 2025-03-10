import { ContentModule } from "../../contentModule.js";

/**
 * Module providing the content content handler (creates a subcanvas if required)
 */
export const contentModule = ContentModule.create(
    "uml/classifier/content",
    [],
    [],
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
);
