import type { Fill } from "./colored.js";
import type { Element } from "./element.js";

/**
 * Element with fill related properties
 */
export interface FilledElement extends Element {
    /**
     * The fill
     */
    fill?: Fill;
}
