import { Fill } from "./colored.js";
import { Element } from "./element.js";

/**
 * Element with fill related properties
 */
export interface FilledElement extends Element {
    /**
     * The fill
     */
    fill?: Fill;
}
