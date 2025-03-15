import type { SimpleStroke } from "./base/colored.js";
import type { Element } from "./base/element.js";
import type { FilledElement } from "./base/filledElement.js";
import type { LayoutedElement } from "./base/layoutedElement.js";

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
    /**
     * The underline to apply to the text, if any
     */
    underline?: TextLine;
    /**
     * The strikethrough to apply to the text, if any
     */
    strikethrough?: TextLine;
}

/**
 * A line (underline or strikethrough) to apply to text
 * The x position and width is obtained from the containing text element
 */
export interface TextLine extends SimpleStroke {
    /**
     * The y position of the line
     */
    y: number;
    /**
     * The thickness of the line
     */
    width: number;
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
     *
     * @param value the element to check
     * @returns true if the element is a Text
     */
    export function isText(value: Element): value is Text {
        return value.type === TYPE;
    }
}
