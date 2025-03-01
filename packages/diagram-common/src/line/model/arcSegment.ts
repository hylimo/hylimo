import type { Point } from "../../common/point.js";
import type { Segment } from "./segment.js";

/**
 * Defines an circular arc line
 */
export interface ArcSegment extends Segment {
    type: typeof ArcSegment.TYPE;

    /**
     * The center point
     */
    center: Point;
    /**
     * The radius in x direction
     */
    radiusX: number;
    /**
     * The radius in y direction
     */
    radiusY: number;
    /**
     * Clockwise or counter-clockwise arc?
     */
    clockwise: boolean;
}

export namespace ArcSegment {
    /**
     * Type for ArcSegment
     */
    export const TYPE = "arc";
}
