import { Shape, Element } from "./base";

/**
 * A rectangle with content
 */
export interface Rect extends Shape {
    type: "rect";
    /**
     * The radius of the corners
     */
    cornerRadius?: number;
}

/**
 * An ellipse with content
 */
export interface Ellipse extends Shape {
    type: "ellipse";
}

/**
 *  A circle with content
 */
export interface Circle extends Shape {
    type: "circle";
}

/**
 * An SVG path shape
 */
export interface Path extends Shape {
    type: "path";
    /**
     * Defines the path
     */
    path: string;
}

/**
 * Text element
 * Always rendered in a single line
 */
export interface Text extends Element {
    type: "text";
    /**
     * The text to display
     */
    text: string;
    /**
     * The color of the text
     */
    foreground: string;
    /**
     * The font family to use
     */
    fontFamily: string;
    /**
     * Text size
     */
    fontSize: number;
    /**
     * normal or bold weight
     */
    fontWeight: "normal" | "bold";
    /**
     * normal or italic style
     */
    fontStyle: "normal" | "italic";
}
