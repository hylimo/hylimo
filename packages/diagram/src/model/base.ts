import { BoundsAware, SModelElement } from "sprotty-protocol";

/**
 * Base class for all elements
 */
export interface Element extends SModelElement, BoundsAware {
    /**
     * Child elementes
     */
    children: Element[];
}

/**
 * An element which displays some graphics
 */
export interface Shape extends Element {
    /**
     * The color of the fill of the shape
     */
    fill?: string;
    /**
     * The opacity applied to the fill
     */
    fillOpacity?: number;
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
