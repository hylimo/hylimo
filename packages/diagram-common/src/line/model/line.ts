import { Matrix } from "transformation-matrix";
import { Point } from "../../common/point.js";
import { Segment } from "./segment.js";

/**
 * A line beginning at a start point, and consisting of a set of segments.
 * A line may be closed or not.
 * Note: mathematically, this is a path
 */
export interface Line {
    /**
     * The start position of the line
     */
    start: Point;
    /**
     * The segments of the line
     */
    segments: Segment[];
    /**
     * Whether the line is closed or not
     */
    isClosed: boolean;
}

/**
 * Line with a transform which should be applied to it to represent its real location on the canvas
 */
export interface TransformedLine {
    /**
     * The associated line
     */
    line: Line;
    /**
     * Transform which should be applied to line
     */
    transform: Matrix;
}
