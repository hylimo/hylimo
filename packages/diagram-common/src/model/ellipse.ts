import { Element } from "./base/element";
import { Shape } from "./shape";

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
     * @param value
     * @returns
     */
    export function isEllipse(value: Element): value is Ellipse {
        return value.type === TYPE;
    }
}
