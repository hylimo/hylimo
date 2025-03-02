import { Math2D } from "../../common/math.js";
import { Point } from "../../common/point.js";
import type { LineSegment } from "../model/lineSegment.js";
import type { NearestPointResult } from "./segmentEngine.js";
import { SegmentEngine } from "./segmentEngine.js";

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
            distance: Math2D.distance(closest, point),
            point: closest
        };
    }

    override getPoint(position: number, distance: number, segment: LineSegment, segmentStartPoint: Point): Point {
        const linePoint = Math2D.linearInterpolate(segmentStartPoint, segment.end, position);
        if (distance != 0) {
            const normalVector = this.getNormalVector(position, segment, segmentStartPoint);
            linePoint.x += normalVector.x * distance;
            linePoint.y += normalVector.y * distance;
        }
        return linePoint;
    }

    override getNormalVector(_position: number, segment: LineSegment, segmentStartPoint: Point): Point {
        const delta = Math2D.sub(segment.end, segmentStartPoint);
        return Math2D.normalize({ x: delta.y, y: -delta.x });
    }

    override exists(segment: LineSegment, segmentStartPoint: Point): boolean {
        return !Point.equals(segmentStartPoint, segment.end);
    }

    override toSvgPath(segment: LineSegment): string {
        return `L ${segment.end.x} ${segment.end.y}`;
    }
}
