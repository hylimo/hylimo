import { Element } from "./base/element.js";
import { Shape } from "./shape.js";

/**
 *  A circle with content
 */
export interface Circle extends Shape {
    type: typeof Circle.TYPE;
}

export namespace Circle {
    /**
     * Type associated with Circle
     */
    export const TYPE = "circle";

    /**
     * Checks if an element is a Circle
     * @param value
     * @returns
     */
    export function isCircle(value: Element): value is Circle {
        return value.type === TYPE;
    }
}
