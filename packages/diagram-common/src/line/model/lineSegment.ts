import type { Segment } from "./segment.js";

/**
 * Straight line segment
 */
export interface LineSegment extends Segment {
    type: typeof LineSegment.TYPE;
}

export namespace LineSegment {
    /**
     * Type for LineSegment
     */
    export const TYPE = "line";
}
