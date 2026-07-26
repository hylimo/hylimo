import { Math2D } from "../../common/math.js";
import { Point } from "../../common/point.js";
import type { ArcCenterParametrization } from "../model/arcSegment.js";
import { ArcSegment } from "../model/arcSegment.js";
import { projectPointOnConic } from "./conicProjection.js";
import type { NearestPointResult } from "./segmentEngine.js";
import { SegmentEngine } from "./segmentEngine.js";

/**
 * Segment engine for ArcSegment.
 *
 * Everything is evaluated on the center form the segment's endpoints imply (see
 * {@link ArcSegment.centerParametrization}), so an ellipse of any eccentricity and rotation is
 * handled exactly. A degenerate arc — no radius, or coincident endpoints — is treated as the
 * straight line SVG draws for it.
 */
export class ArcSegmentEngine extends SegmentEngine<ArcSegment> {
    override projectPoint(point: Point, segment: ArcSegment, segmentStartPoint: Point): NearestPointResult {
        const arc = ArcSegment.centerParametrization(segmentStartPoint, segment.end, segment);
        if (arc == undefined) {
            return this.projectPointOnChord(point, segment, segmentStartPoint);
        }
        let best: NearestPointResult = {
            point: segmentStartPoint,
            distance: Math2D.distance(segmentStartPoint, point),
            position: 0
        };
        const endDistance = Math2D.distance(segment.end, point);
        if (endDistance < best.distance) {
            best = { point: segment.end, distance: endDistance, position: 1 };
        }
        for (const candidate of projectPointOnConic(this.conicEquationOfEllipse(arc), point)) {
            const distance = Math2D.distance(candidate, point);
            if (distance >= best.distance) {
                continue;
            }
            const position = ArcSegment.positionOf(arc, ArcSegment.angleOf(arc, candidate));
            if (position == undefined) {
                continue;
            }
            best = { point: candidate, distance, position };
        }
        return best;
    }

    override getPoint(position: number, distance: number, segment: ArcSegment, segmentStartPoint: Point): Point {
        const arc = ArcSegment.centerParametrization(segmentStartPoint, segment.end, segment);
        const point =
            arc != undefined
                ? ArcSegment.pointAt(arc, arc.startAngle + position * arc.deltaAngle)
                : Math2D.linearInterpolate(segmentStartPoint, segment.end, position);
        if (distance === 0) {
            return point;
        }
        const normal = this.getNormalVector(position, segment, segmentStartPoint);
        return Math2D.add(point, Math2D.scale(normal, distance));
    }

    override getNormalVector(position: number, segment: ArcSegment, segmentStartPoint: Point): Point {
        const arc = ArcSegment.centerParametrization(segmentStartPoint, segment.end, segment);
        const tangent =
            arc != undefined
                ? ArcSegment.tangentAt(arc, arc.startAngle + position * arc.deltaAngle)
                : Math2D.sub(segment.end, segmentStartPoint);
        return Math2D.normalize(Math2D.normal(tangent));
    }

    override exists(segment: ArcSegment, segmentStartPoint: Point): boolean {
        return !Point.equals(segmentStartPoint, segment.end);
    }

    override toSvgPath(segment: ArcSegment): string {
        const rotation = (segment.rotation * 180) / Math.PI;
        const largeArc = segment.largeArc ? 1 : 0;
        const sweep = segment.sweep ? 1 : 0;
        return `A ${segment.radiusX} ${segment.radiusY} ${rotation} ${largeArc} ${sweep} ${segment.end.x} ${segment.end.y}`;
    }

    /**
     * Calculates the coefficients of the conic equation `Ax² + 2Bxy + Cy² + 2Dx + 2Ey + F = 0` of the
     * ellipse an arc lies on, which is what {@link projectPointOnConic} projects onto. The rotation
     * of the ellipse is what makes the mixed term `B` non-zero.
     *
     * @param arc the arc whose ellipse the equation is built for
     * @returns the coefficients A, B, C, D, E, and F, in that order
     */
    private conicEquationOfEllipse(arc: ArcCenterParametrization): [number, number, number, number, number, number] {
        const { x: cx, y: cy } = arc.center;
        const cos = Math.cos(arc.rotation);
        const sin = Math.sin(arc.rotation);
        const squaredX = arc.radiusX ** 2;
        const squaredY = arc.radiusY ** 2;
        const A = squaredY * cos ** 2 + squaredX * sin ** 2;
        const B = cos * sin * (squaredY - squaredX);
        const C = squaredY * sin ** 2 + squaredX * cos ** 2;
        const D = -(A * cx + B * cy);
        const E = -(B * cx + C * cy);
        const F = A * cx * cx + 2 * B * cx * cy + C * cy * cy - squaredX * squaredY;
        return [A, B, C, D, E, F];
    }

    /**
     * Projects a point on the chord of a degenerate arc, which SVG draws as a straight line
     *
     * @param point the point to project
     * @param segment the degenerate arc
     * @param segmentStartPoint the start position of the segment
     * @returns the nearest point on the chord
     */
    private projectPointOnChord(point: Point, segment: ArcSegment, segmentStartPoint: Point): NearestPointResult {
        const delta = Math2D.sub(segment.end, segmentStartPoint);
        const squaredLength = delta.x ** 2 + delta.y ** 2;
        const position =
            squaredLength === 0
                ? 0
                : Math.min(Math.max(Math2D.dot(Math2D.sub(point, segmentStartPoint), delta) / squaredLength, 0), 1);
        const closest = Math2D.linearInterpolate(segmentStartPoint, segment.end, position);
        return { position, distance: Math2D.distance(closest, point), point: closest };
    }
}
