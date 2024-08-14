import { Bezier } from "bezier-js";
import { Math2D } from "../../common/math.js";
import { Point } from "../../common/point.js";
import { BezierSegment } from "../model/bezierSegment.js";
import { NearestPointResult, SegmentEngine } from "./segmentEngine.js";

/**
 * Segment engine for BezierSegment
 */
export class BezierSegmentEngine extends SegmentEngine<BezierSegment> {
    override projectPoint(point: Point, segment: BezierSegment, segmentStartPoint: Point): NearestPointResult {
        const curve = new Bezier(segmentStartPoint, segment.startControlPoint, segment.endControlPoint, segment.end);
        const projection = curve.project(point);
        return {
            distance: Math2D.distance(projection, point),
            position: projection.t!,
            point: projection
        };
    }

    override getPoint(position: number, distance: number, segment: BezierSegment, segmentStartPoint: Point): Point {
        const curve = new Bezier(segmentStartPoint, segment.startControlPoint, segment.endControlPoint, segment.end);
        const linePoint = curve.get(position);
        if (distance != 0) {
            const normal = curve.normal(position);
            linePoint.x += normal.x * distance;
            linePoint.y += normal.y * distance;
        }
        return linePoint;
    }

    override getNormalVector(position: number, segment: BezierSegment, segmentStartPoint: Point): Point {
        const curve = new Bezier(segmentStartPoint, segment.startControlPoint, segment.endControlPoint, segment.end);
        return curve.normal(position);
    }
}
