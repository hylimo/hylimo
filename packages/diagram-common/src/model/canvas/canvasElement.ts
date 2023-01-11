import { Element } from "../base/element";
import { SizedElement } from "../base/sizedElement";

/**
 * Moveable and resizeable element in a canvas
 */
export interface CanvasElement extends SizedElement {
    type: typeof CanvasElement.TYPE;
    /**
     * The id of the CanvasPoint which is used as start
     */
    position: string;
    /**
     * If true, this is resizable
     */
    resizable: boolean;
}

export namespace CanvasElement {
    /**
     * Type associated with CanvasElement
     */
    export const TYPE = "canvasElement";

    /**
     * Checks if an element is a CanvasElement
     * @param value
     * @returns
     */
    export function isCanvasElement(value: Element): value is CanvasElement {
        return value.type === TYPE;
    }
}
