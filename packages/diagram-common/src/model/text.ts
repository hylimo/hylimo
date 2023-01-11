import { Element } from "./base/element";
import { LayoutedElement } from "./base/layoutedElement";

/**
 * Text element
 * Always rendered in a single line
 */
export interface Text extends LayoutedElement {
    type: typeof Text.TYPE;
    /**
     * The text to display
     */
    text: string;
    /**
     * The color of the text
     */
    fill: string;
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
