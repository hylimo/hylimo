import { Element } from "./base/element";
import { Shape } from "./shape";

/**
 * An SVG path shape
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
     * @param value
     * @returns
     */
    export function isPath(value: Element): value is Path {
        return value.type === TYPE;
    }
}
