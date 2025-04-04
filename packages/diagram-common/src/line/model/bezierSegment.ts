import type { Point } from "../../common/point.js";
import type { Segment } from "./segment.js";

/**
 * Bezier line segment consisting of a cubic bezier curve
 */
export interface BezierSegment extends Segment {
    type: typeof BezierSegment.TYPE;

    /**
     * The control point associated with start
     */
    startControlPoint: Point;

    /**
     * The control point associated with end
     */
    endControlPoint: Point;
}

export namespace BezierSegment {
    /**
     * Type for BezierSegment
     */
    export const TYPE = "bezier";
}
