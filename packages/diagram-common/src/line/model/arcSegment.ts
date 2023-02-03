import { Segment } from "./segment";

/**
 * Defines an elliptical arc line
 */
export interface ArcSegment extends Segment {
    type: typeof ArcSegment.TYPE;

    /**
     * The x radius of the ellipse
     */
    rx: number;
    /**
     * The y radius of the ellipse
     */
    ry: number;
    /**
     * The rotationof the ellipse
     */
    rotation: number;
    /**
     * Of the 4 possible arcs, use a large or a small one
     */
    largeArc: boolean;
    /**
     * Of the 4 possible arcs, use one going clockwise or counter-clockwise
     */
    sweep: boolean;
}

export namespace ArcSegment {
    /**
     * Type for ArcSegment
     */
    export const TYPE = "arc";
}
