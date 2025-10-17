import type { Fill, TextLine, FontStyle, FontWeight, Text } from "@hylimo/diagram-common";
import type { LinearAnimatable } from "../features/animation/model.js";
import { SLayoutedElement } from "./sLayoutedElement.js";

/**
 * Animated fields for SText
 */
const textAnimatedFields = new Set(SLayoutedElement.defaultAnimatedFields);

/**
 * Text model element
 */
export class SText extends SLayoutedElement implements Text, LinearAnimatable {
    override type!: typeof Text.TYPE;
    readonly animatedFields = textAnimatedFields;
    /**
     * The text to display
     */
    text!: string;
    /**
     * The color of the text
     */
    fill?: Fill;
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
    fontWeight!: FontWeight;
    /**
     * normal or italic style
     */
    fontStyle!: FontStyle;
    /**
     * The font feature settings to use, if any
     */
    fontFeatureSettings?: string[];
    /**
     * The underline to apply to the text, if any
     */
    underline?: TextLine;
    /**
     * The strikethrough to apply to the text, if any
     */
    strikethrough?: TextLine;
}
