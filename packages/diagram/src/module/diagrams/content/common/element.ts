import { ContentModule } from "../contentModule.js";

/**
 * Module providing the element function to create arbitrary canvas elements
 */
export const elementModule = ContentModule.create(
    "common/element",
    [],
    [],
    `
        scope.element = {
            callbackOrElement = it
            this.element = if(callbackOrElement._type == "element") {
                canvasElement(content = callbackOrElement)
            } {
                canvasElement(content = callbackOrElement())
            }
            scope.internal.registerCanvasElement(this.element, args, args.self)
        }
    `
);
