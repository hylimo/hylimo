import type { Element } from "../base/element.js";
import type { LayoutedElement } from "../base/layoutedElement.js";

/**
 * Canvas consisting of points, elements and connections.
 * Must have only CanvasElement and CanvasConnection as children
 */
export interface Canvas extends LayoutedElement {
    type: typeof Canvas.TYPE;
    /**
     * The x offset applied to its coordinate system
     */
    dx: number;
    /**
     * The y offset applied to its coordinate system
     */
    dy: number;
}

export namespace Canvas {
    /**
     * Type associated with Canvas
     */
    export const TYPE = "canvas";

    /**
     * Checks if an element is a Canvas
     *
     * @param value the element to check
     * @returns true if the element is a Canvas
     */
    export function isCanvas(value: Element): value is Canvas {
        return value.type === TYPE;
    }
}
