import { Point } from "../../common/point";
import { Segment } from "./segment";

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
}

/**
 * Defines how a line is transformed in the canvas
 */
export interface LineTransform {
    /**
     * x and y translation
     */
    translation: Point;
}

export namespace LineTransform {
    /**
     * Applies the inverse transform to point
     *
     * @param point the point to inverse transform
     * @param transform the transform to use
     * @returns a new point with the transform applied in reverse
     */
    export function inverseTransform(transform: LineTransform, point: Point): Point {
        return {
            x: point.x - transform.translation.x,
            y: point.y - transform.translation.y
        };
    }

    /**
     * Applies the transform to point
     *
     * @param point the point to transform
     * @param transform the transform to use
     * @returns a new point with the transform applied
     */
    export function transform(transform: LineTransform, point: Point): Point {
        return {
            x: point.x + transform.translation.x,
            y: point.y + transform.translation.y
        };
    }
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
    transform: LineTransform;
}
