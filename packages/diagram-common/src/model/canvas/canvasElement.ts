import { Element } from "../element";

/**
 * Moveable and resizeable element in a canvas
 */
export interface CanvasElement extends Element {
    type: "canvasElement";
    /**
     * The id of the CanvasPoint which is used as start
     */
    position: string;
    /**
     * If true, this is resizable
     */
    resizable: boolean;
}
