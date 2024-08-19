import { Line } from "../../../line/model/line.js";
import { Element } from "../base/element.js";
import { LayoutedElement } from "../base/layoutedElement.js";
import { EditSpecification } from "../editSpecification.js";

/**
 * Moveable and resizeable element in a canvas
 */
export interface CanvasElement extends LayoutedElement {
    type: typeof CanvasElement.TYPE;
    /**
     * The id of the CanvasPoint which is used as start
     */
    pos?: string;
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
        if (element.pos != undefined) {
            return [element.pos];
        } else {
            return [];
        }
    }
}
