import { Stroke } from "./colored.js";
import { Element } from "./element.js";

/**
 * Element with stroke related properties
 */
export interface StrokedElement extends Element {
    /**
     * The stroke
     */
    stroke?: Stroke;
}
