import { Point } from "../../common/point";
import { Segment } from "../model/segment";

/**
 * Base class for all segment engines.
 * Provides functions to get the nearest point on the line, and a point at a specific position.
 * The position of a point on a line is defined by a number between 0 and 1.
 */
export abstract class SegmentEngine<T extends Segment> {
    /**
     * Finds the nearest point on the provided segment to point.
     *
     * @param point the point to which the nearest point should be found
     * @param segment the segment on which the point must be
     * @param segmentStartPoint the start position of the segment
     * @returns a definition of the nearest point and its distance
     */
    abstract projectPoint(point: Point, segment: T, segmentStartPoint: Point): NearestPointResult;

    /**
     * Gets a point on a segment
     *
     * @param position the position of the point on the segment, a number between 0 and 1
     * @param segment the segment on which the point should be
     * @param segmentStartPoint the start position of the segment
     * @returns the point on the segment
     */
    abstract getPoint(position: number, segment: T, segmentStartPoint: Point): Point;
}

/**
 * Result of getNearestPoint
 */
export interface NearestPointResult {
    /**
     * The segment specific value between 0 and 1 which defines where on the segment the point is
     */
    position: number;
    /**
     * The distance to the provided point
     */
    distance: number;
}
