import type { Stroke } from "./colored.js";
import type { Element } from "./element.js";

/**
 * Element with stroke related properties
 */
export interface StrokedElement extends Element {
    /**
     * The stroke
     */
    stroke?: Stroke;
}
