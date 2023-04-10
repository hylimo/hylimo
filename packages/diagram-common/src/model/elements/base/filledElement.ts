import { Fill } from "./colored";
import { Element } from "./element";

/**
 * Element with fill related properties
 */
export interface FilledElement extends Element {
    /**
     * The fill
     */
    fill?: Fill;
}
