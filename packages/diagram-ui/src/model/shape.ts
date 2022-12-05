import { SElement } from "./element";

/**
 * Base class for all shapes
 */
export abstract class SShape extends SElement {
    /**
     * The color of the fill of the shape
     */
    fill!: string;
    /**
     * The opacity applied to the fill
     */
    fillOpacity!: number;
    /**
     * The color of the stroke
     */
    stroke!: string;
    /**
     * The opacity applied to the stroke
     */
    strokeOpacity!: number;
    /**
     * The width of the stroke
     */
    strokeWidth!: number;
}
