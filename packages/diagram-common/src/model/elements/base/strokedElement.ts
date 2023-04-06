import { Stroke } from "./colored";
import { Element } from "./element";

/**
 * Element with stroke related properties
 */
export interface StrokedElement extends Element {
    /**
     * The stroke
     */
    stroke?: Stroke;
}
