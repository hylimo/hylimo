import { LayoutedElement } from "./base/layoutedElement";
import { StrokedElement } from "./base/strokedElement";

/**
 * An element which displays some graphics
 */
export interface Shape extends LayoutedElement, StrokedElement {
    /**
     * The color of the fill of the shape
     */
    fill?: string;
    /**
     * The opacity applied to the fill
     */
    fillOpacity?: number;
}
