import { Line } from "../../../line/model/line.js";
import { Element } from "../base/element.js";
import { SizedElement } from "../base/sizedElement.js";

/**
 * Moveable and resizeable element in a canvas
 */
export interface CanvasElement extends SizedElement {
    type: typeof CanvasElement.TYPE;
    /**
     * The id of the CanvasPoint which is used as start
     */
    pos?: string;
    /**
     * The x offset, applied before rotation
     */
    dx: number;
    /**
     * The y offset, applied before rotation
     */
    dy: number;
    /**
     * The rotation in degrees
     */
    rotation: number;
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
     *
     * @param value the element to check
     * @returns true if the element is a CanvasElement
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
        if (element.pos != undefined) {
            return [element.pos];
        } else {
            return [];
        }
    }
}
