import { Point } from "../../common/point";
import { Segment } from "./segment";

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
     * The radius
     */
    radius: number;
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
