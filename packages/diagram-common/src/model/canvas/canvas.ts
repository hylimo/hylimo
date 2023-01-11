import { Element } from "../base/element";
import { LayoutedElement } from "../base/layoutedElement";

/**
 * Canvas consisting of points, elements and connections.
 * Must have only CanvasElement and CanvasConnection as children
 */
export interface Canvas extends LayoutedElement {
    type: typeof Canvas.TYPE;
}

export namespace Canvas {
    /**
     * Type associated with Canvas
     */
    export const TYPE = "canvas";

    /**
     * Checks if an element is a Canvas
     * @param value
     * @returns
     */
    export function isCanvas(value: Element): value is Canvas {
        return value.type === TYPE;
    }
}
