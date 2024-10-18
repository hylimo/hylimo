import { Element } from "./base/element.js";
import { FilledElement } from "./base/filledElement.js";
import { LayoutedElement } from "./base/layoutedElement.js";

/**
 * Text element
 * Always rendered in a single line
 */
export interface Text extends LayoutedElement, FilledElement {
    type: typeof Text.TYPE;
    /**
     * The text to display
     */
    text: string;
    /**
     * The font family to use
     */
    fontFamily: string;
    /**
     * Text size
     */
    fontSize: number;
}

/**
 * Enum for font weights, includes normal and bold
 */
export enum FontWeight {
    Normal = "normal",
    Bold = "bold"
}

/**
 * Enum for font styles, includes normal and italic
 */
export enum FontStyle {
    Normal = "normal",
    Italic = "italic"
}

export namespace Text {
    /**
     * Type associated with Text
     */
    export const TYPE = "text";

    /**
     * Checks if an element is a Text
     * @param value
     * @returns
     */
    export function isText(value: Element): value is Text {
        return value.type === TYPE;
    }
}
