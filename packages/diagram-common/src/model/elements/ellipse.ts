import { Element } from "./base/element.js";
import { Shape } from "./shape.js";

/**
 * An ellipse with content
 */
export interface Ellipse extends Shape {
    type: typeof Ellipse.TYPE;
}

export namespace Ellipse {
    /**
     * Type associated with Ellipse
     */
    export const TYPE = "ellipse";

    /**
     * Checks if an element is a Ellipse
     *
     * @param value the element to check
     * @returns true if the element is a Ellipse
     */
    export function isEllipse(value: Element): value is Ellipse {
        return value.type === TYPE;
    }
}
