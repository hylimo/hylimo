import { Line } from "../../line/model/line";
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
    pos: string;
    /**
     * Resizable if present
     */
    resizable?: number[];
    /**
     * The outline of the CanvasElement
     */
    outline: Line;
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

    /**
     * Gets the dependencies required for layouting
     * @param element the element to get the dependencies of
     * @returns the list of dependencies, may contain duplicates
     */
    export function getDependencies(element: CanvasElement): string[] {
        return [element.pos];
    }
}
