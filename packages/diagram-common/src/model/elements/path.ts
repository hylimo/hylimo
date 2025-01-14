import { Element } from "./base/element.js";
import { Shape } from "./shape.js";

/**
 * An SVG path shape
 * Note: while x and y have to be respected, width and height should be ignored
 */
export interface Path extends Shape {
    type: typeof Path.TYPE;
    /**
     * Defines the path
     */
    path: string;
}

export namespace Path {
    /**
     * Type associated with Path
     */
    export const TYPE = "path";

    /**
     * Checks if an element is a Path
     *
     * @param value the element to check
     * @returns true if the element is a Path
     */
    export function isPath(value: Element): value is Path {
        return value.type === TYPE;
    }
}
