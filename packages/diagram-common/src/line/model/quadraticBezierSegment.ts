import type { Point } from "../../common/point.js";
import type { Segment } from "./segment.js";

/**
 * Bezier line segment consisting of a quadratic bezier curve.
 * A quadratic curve can be raised to the cubic {@link BezierSegment} that draws exactly the same
 * curve, but keeping it quadratic keeps a shape outline made of `Q` commands one segment per
 * authored command, and lets it convert back to the same command it came from.
 */
export interface QuadraticBezierSegment extends Segment {
    type: typeof QuadraticBezierSegment.TYPE;

    /**
     * The single control point shared by both ends
     */
    controlPoint: Point;
}

export namespace QuadraticBezierSegment {
    /**
     * Type for QuadraticBezierSegment
     */
    export const TYPE = "quadraticBezier";
}
