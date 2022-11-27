import { Shape } from "./base";

/**
 * A rectangle with content
 */
export interface Rect extends Shape {
    /**
     * The radius of the corners
     */
    cornerRadius?: number;
}

/**
 * An ellipse with content
 */
export interface Ellipse extends Shape {}

/**
 *  A circle with content
 */
export interface Circle extends Shape {}

/**
 * An SVG path shape
 */
export interface Path extends Shape {
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
    fontWeight: "normal" | "bold"
    /**
     * normal or italic style
     */
    fontStyle: "normal" | "italic"
}