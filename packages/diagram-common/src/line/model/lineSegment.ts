import { Segment } from "./segment";

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
