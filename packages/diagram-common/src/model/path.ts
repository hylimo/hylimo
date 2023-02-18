import { Element } from "./base/element";
import { Shape } from "./shape";

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
    /**
     * Defines how segments are joined together
     */
    lineJoin: LineJoin;
    /**
     * Defines how the end of a line is drawn
     */
    lineCap: LineCap;
    /**
     * Defines the max miter length relative to the line width
     */
    miterLimit: number;
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

/**
 * Stroke line join styles
 */
export enum LineJoin {
    Miter = "miter",
    Round = "round",
    Bevel = "bevel"
}

/**
 * Stroke line cap styles
 */
export enum LineCap {
    Butt = "butt",
    Round = "round",
    Square = "square"
}
