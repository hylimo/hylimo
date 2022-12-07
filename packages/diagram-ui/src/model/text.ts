import { SElement } from "./element";

/**
 * Text model element
 */
export class SText extends SElement {
    /**
     * The text to display
     */
    text!: string;
    /**
     * The color of the text
     */
    fill!: string;
    /**
     * The font family to use
     */
    fontFamily!: string;
    /**
     * Text size
     */
    fontSize!: number;
    /**
     * normal or bold weight
     */
    fontWeight!: "normal" | "bold";
    /**
     * normal or italic style
     */
    fontStyle!: "normal" | "italic";
}
