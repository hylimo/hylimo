import type { Element } from "./base/element.js";
import type { Shape } from "./shape.js";

/**
 * A rectangle with content
 */
export interface Rect extends Shape {
    type: typeof Rect.TYPE;
    /**
     * The radius of the corners
     */
    cornerRadius?: number;
}

export namespace Rect {
    /**
     * Type associated with Rect
     */
    export const TYPE = "rect";

    /**
     * Checks if an element is a Rect
     *
     * @param value the element to check
     * @returns true if the element is a Rect
     */
    export function isRect(value: Element): value is Rect {
        return value.type === TYPE;
    }
}
