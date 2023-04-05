import { Math2D } from "../../common/math";
import { Point } from "../../common/point";
import { ArcSegment } from "../model/arcSegment";
import { projectPointOnConic } from "./conicProjection";
import { NearestPointResult, SegmentEngine } from "./segmentEngine";

/**
 * Segment engine for ArcSegment
 */
export class ArcSegmentEngine extends SegmentEngine<ArcSegment> {
    override projectPoint(point: Point, segment: ArcSegment, segmentStartPoint: Point): NearestPointResult {
        const { startAngle, deltaAngle } = this.getArcData(segmentStartPoint, segment);
        const possiblePoints = [segmentStartPoint, segment.end];
        possiblePoints.push(
            ...projectPointOnConic(
                this.conicEquationOfEllipse(segment.radiusX, segment.radiusY, segment.center.x, segment.center.y),
                point
            )
        );
        let minDist = Number.POSITIVE_INFINITY;
        let minPos = 0;
        let minPoint = possiblePoints[0];
        for (let i = 0; i < possiblePoints.length; i++) {
            const p = possiblePoints[i];
            const dist = Math2D.distance(possiblePoints[i], point);
            if (dist < minDist) {
                if (i <= 1) {
                    minPos = i;
                } else {
                    const angle = Math2D.angle(Math2D.sub(p, segment.center));
                    let deltaPointAngle = angle - startAngle;
                    if (deltaPointAngle < 0 && deltaAngle > 0) {
                        deltaPointAngle += 2 * Math.PI;
                    } else if (deltaAngle > 0 && deltaAngle < 0) {
                        deltaPointAngle -= 2 * Math.PI;
                    }
                    if (Math.abs(deltaPointAngle) < Math.abs(deltaAngle)) {
                        minPos = deltaPointAngle / deltaAngle;
                    } else {
                        continue;
                    }
                }
                minPoint = p;
                minDist = dist;
            }
        }

        return {
            point: minPoint,
            distance: minDist,
            position: minPos
        };
    }

    /**
     * Calculates the coefficients of the conic equation for an ellipse with the given semi-axes lengths and center coordinates.
     *
     * @param dx The semi-axis length in the x-direction.
     * @param dy The semi-axis length in the y-direction.
     * @param cx The x-coordinate of the center.
     * @param cy The y-coordinate of the center.
     * @returns A tuple with the coefficients A, B, C, D, E, and F of the conic equation, in that order.
     */
    private conicEquationOfEllipse(
        dx: number,
        dy: number,
        cx: number,
        cy: number
    ): [number, number, number, number, number, number] {
        const A = dx ** 2;
        const B = 0;
        const C = dy ** 2;
        const D = -cx * dx ** 2;
        const E = -cy * dy ** 2;
        const F = dx ** 2 * cx ** 2 + dy ** 2 * cy ** 2 - dx ** 2 * dy ** 2;
        return [A, B, C, D, E, F];
    }

    override getPoint(position: number, distance: number, segment: ArcSegment, segmentStartPoint: Point): Point {
        const { startAngle, deltaAngle } = this.getArcData(segmentStartPoint, segment);
        const finalAngle = startAngle + position * deltaAngle;
        const center = segment.center;
        const normal = Math2D.scaleTo(this.getNormalVector(position, segment, segmentStartPoint), distance);
        const point = {
            x: center.x + segment.radiusX * Math.cos(finalAngle),
            y: center.y + segment.radiusY * Math.sin(finalAngle)
        };
        return Math2D.add(point, normal);
    }

    override getNormalVector(position: number, segment: ArcSegment, segmentStartPoint: Point): Point {
        const { startAngle, deltaAngle } = this.getArcData(segmentStartPoint, segment);
        const a = startAngle + position * deltaAngle;
        const dx = segment.radiusX;
        const dy = segment.radiusY;
        const nx = (dy * Math.cos(a)) / Math.sqrt((dy * Math.cos(a)) ** 2 + (dx * Math.sin(a)) ** 2);
        const ny = (dx * Math.sin(a)) / Math.sqrt((dy * Math.cos(a)) ** 2 + (dx * Math.sin(a)) ** 2);

        if (Math.cos(a) < 0) {
            return { x: -nx, y: -ny };
        } else {
            return { x: nx, y: ny };
        }
    }

    /**
     * Generates additional data for an arc
     *
     * @param segmentStartPoint the start point of the arc
     * @param segment the arc
     * @returns the additional data
     */
    private getArcData(segmentStartPoint: Point, segment: ArcSegment): ArcData {
        const relativeStart = Math2D.sub(segmentStartPoint, segment.center);
        const relativeEnd = Math2D.sub(segment.end, segment.center);
        const startAngle = Math2D.angle(relativeStart);
        const endAngle = Math2D.angle(relativeEnd);
        let deltaAngle: number;
        if (segment.clockwise) {
            deltaAngle = endAngle - startAngle;
            if (deltaAngle < 0) {
                deltaAngle += 2 * Math.PI;
            }
        } else {
            deltaAngle = startAngle - endAngle;
            if (deltaAngle > 0) {
                deltaAngle -= 2 * Math.PI;
            }
        }
        return {
            startAngle,
            endAngle,
            deltaAngle
        };
    }
}

/**
 * Some additional data about an arc
 */
interface ArcData {
    /**
     * The angle of the start pos
     */
    startAngle: number;
    /**
     * The angle of the end pos
     */
    endAngle: number;
    /**
     * The delta of the two angles in the correct direction
     */
    deltaAngle: number;
}
