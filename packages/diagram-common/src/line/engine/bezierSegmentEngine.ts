import { Bezier } from "bezier-js";
import { Point } from "../../common/point";
import { BezierSegment } from "../model/bezierSegment";
import { NearestPointResult, SegmentEngine } from "./segmentEngine";

/**
 * Segment engine for BezierSegment
 */
export class BezierSegmentEngine extends SegmentEngine<BezierSegment> {
    override getNearestPoint(point: Point, segment: BezierSegment, segmentStartPoint: Point): NearestPointResult {
        const curve = new Bezier(segmentStartPoint, segment.startControlPoint, segment.endControlPoint, segment.end);
        const projection = curve.project(point);
        return {
            distance: projection.d!,
            position: projection.t!
        };
    }

    override getPoint(position: number, segment: BezierSegment, segmentStartPoint: Point): Point {
        const curve = new Bezier(segmentStartPoint, segment.startControlPoint, segment.endControlPoint, segment.end);
        return curve.get(position);
    }
}
