import { Point } from "../../common/point";
import { LineSegment } from "../model/lineSegment";
import { NearestPointResult, SegmentEngine } from "./segmentEngine";
import { Point as SprottyPoint } from "sprotty-protocol";

/**
 * Segment engine for LineSegment
 */
export class LineSegmentEngine extends SegmentEngine<LineSegment> {
    override projectPoint(point: Point, segment: LineSegment, segmentStartPoint: Point): NearestPointResult {
        const x1 = segmentStartPoint;
        const x2 = segment.end;

        const dx = x2.x - x1.x;
        const dy = x2.y - x1.y;
        const d2 = dx * dx + dy * dy;
        const t = ((point.x - x1.x) * dx + (point.y - x1.y) * dy) / d2;

        let closest: Point;
        let position: number;
        if (t < 0) {
            closest = x1;
            position = 0;
        } else if (t > 1) {
            closest = x2;
            position = 1;
        } else {
            closest = {
                x: x1.x + t * dx,
                y: x1.y + t * dy
            };
            position = t;
        }

        return {
            position,
            distance: SprottyPoint.euclideanDistance(closest, point)
        };
    }

    override getPoint(position: number, segment: LineSegment, segmentStartPoint: Point): Point {
        return SprottyPoint.linear(segmentStartPoint, segment.end, position);
    }
}
