import { Bezier } from "bezier-js";
import { Math2D } from "../../common/math.js";
import { Point } from "../../common/point.js";
import type { BezierSegment } from "../model/bezierSegment.js";
import type { NearestPointResult } from "./segmentEngine.js";
import { SegmentEngine } from "./segmentEngine.js";

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
            const normal = this.getNormalVector(position, segment, segmentStartPoint);
            linePoint.x += normal.x * distance;
            linePoint.y += normal.y * distance;
        }
        return linePoint;
    }

    /**
     * The normal is the direction of travel turned by -90°, the same convention every other engine
     * uses — and the opposite of what bezier-js' own `normal` returns, which would put a point at a
     * positive distance on the other side of a bezier than of a line.
     */
    override getNormalVector(position: number, segment: BezierSegment, segmentStartPoint: Point): Point {
        const curve = new Bezier(segmentStartPoint, segment.startControlPoint, segment.endControlPoint, segment.end);
        return Math2D.normalize(Math2D.normal(curve.derivative(position)));
    }

    override exists(segment: BezierSegment, segmentStartPoint: Point): boolean {
        return !(
            Point.equals(segmentStartPoint, segment.end) &&
            Point.equals(segmentStartPoint, segment.startControlPoint) &&
            Point.equals(segmentStartPoint, segment.endControlPoint)
        );
    }

    override toSvgPath(segment: BezierSegment): string {
        return `C ${segment.startControlPoint.x} ${segment.startControlPoint.y}, ${segment.endControlPoint.x} ${segment.endControlPoint.y}, ${segment.end.x} ${segment.end.y}`;
    }
}
