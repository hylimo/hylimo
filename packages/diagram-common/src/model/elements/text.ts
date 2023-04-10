import { Element } from "./base/element";
import { FilledElement } from "./base/filledElement";
import { LayoutedElement } from "./base/layoutedElement";

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
     * normal or bold weight
     */
    fontWeight: FontWeight;
    /**
     * normal or italic style
     */
    fontStyle: FontStyle;
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
