import { Element } from "./element";

/**
 * Element with stroke related properties
 */
export interface StrokedElement extends Element {
    /**
     * The color of the stroke
     */
    stroke?: string;
    /**
     * The opacity applied to the stroke
     */
    strokeOpacity?: number;
    /**
     * The width of the stroke
     */
    strokeWidth?: number;
}
