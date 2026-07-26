import { Bezier } from "bezier-js";
import { Math2D } from "../../common/math.js";
import { Point } from "../../common/point.js";
import type { QuadraticBezierSegment } from "../model/quadraticBezierSegment.js";
import type { NearestPointResult } from "./segmentEngine.js";
import { SegmentEngine } from "./segmentEngine.js";

/**
 * Segment engine for QuadraticBezierSegment
 */
export class QuadraticBezierSegmentEngine extends SegmentEngine<QuadraticBezierSegment> {
    override projectPoint(point: Point, segment: QuadraticBezierSegment, segmentStartPoint: Point): NearestPointResult {
        const curve = this.curve(segment, segmentStartPoint);
        const projection = curve.project(point);
        return {
            distance: Math2D.distance(projection, point),
            position: projection.t!,
            point: projection
        };
    }

    override getPoint(
        position: number,
        distance: number,
        segment: QuadraticBezierSegment,
        segmentStartPoint: Point
    ): Point {
        const curve = this.curve(segment, segmentStartPoint);
        const linePoint = curve.get(position);
        if (distance != 0) {
            const normal = this.getNormalVector(position, segment, segmentStartPoint);
            linePoint.x += normal.x * distance;
            linePoint.y += normal.y * distance;
        }
        return linePoint;
    }

    override getNormalVector(position: number, segment: QuadraticBezierSegment, segmentStartPoint: Point): Point {
        const curve = this.curve(segment, segmentStartPoint);
        return Math2D.normalize(Math2D.normal(curve.derivative(position)));
    }

    override exists(segment: QuadraticBezierSegment, segmentStartPoint: Point): boolean {
        return !(Point.equals(segmentStartPoint, segment.end) && Point.equals(segmentStartPoint, segment.controlPoint));
    }

    override toSvgPath(segment: QuadraticBezierSegment): string {
        return `Q ${segment.controlPoint.x} ${segment.controlPoint.y}, ${segment.end.x} ${segment.end.y}`;
    }

    /**
     * Builds the curve of a segment
     *
     * @param segment the segment to build the curve of
     * @param segmentStartPoint the start position of the segment
     * @returns the curve
     */
    private curve(segment: QuadraticBezierSegment, segmentStartPoint: Point): Bezier {
        return new Bezier(segmentStartPoint, segment.controlPoint, segment.end);
    }
}
