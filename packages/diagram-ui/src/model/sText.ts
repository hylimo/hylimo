import { LinearAnimatable } from "../features/animation/model";
import { SLayoutedElement } from "./sLayoutedElement";

/**
 * Animated fields for SText
 */
const textAnimatedFields = new Set(SLayoutedElement.defaultAnimatedFields);

/**
 * Text model element
 */
export class SText extends SLayoutedElement implements LinearAnimatable {
    readonly animatedFields = textAnimatedFields;
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
