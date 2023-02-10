import { Point } from "../../common/point";
import { ArcSegment } from "../model/arcSegment";
import { NearestPointResult, SegmentEngine } from "./segmentEngine";
import { angleOfPoint, Point as SprottyPoint } from "sprotty-protocol";

/**
 * Segment engine for ArcSegment
 */
export class ArcSegmentEngine extends SegmentEngine<ArcSegment> {
    override projectPoint(point: Point, segment: ArcSegment, segmentStartPoint: Point): NearestPointResult {
        const { startAngle, deltaAngle } = this.getArcData(segmentStartPoint, segment);
        const endAngle = startAngle + deltaAngle;
        const dist = (x: number) => {
            const dx = point.x - (segment.center.x + segment.radius * Math.cos(x));
            const dy = point.y - (segment.center.y + segment.radius * Math.sin(x));
            return Math.sqrt(dx * dx + dy * dy);
        };
        const angle = angleOfPoint(SprottyPoint.subtract(point, segment.center));
        let deltaPointAngle = angle - startAngle;
        if (deltaPointAngle < 0 && deltaAngle > 0) {
            deltaPointAngle += 2 * Math.PI;
        } else if (deltaAngle > 0 && deltaAngle < 0) {
            deltaPointAngle -= 2 * Math.PI;
        }
        if (Math.abs(deltaPointAngle) < Math.abs(deltaAngle)) {
            return {
                distance: dist(angle),
                position: deltaPointAngle / deltaAngle
            };
        } else {
            const startDist = dist(startAngle);
            const endDist = dist(endAngle);
            if (startDist < endDist) {
                return {
                    distance: startDist,
                    position: 0
                };
            } else {
                return {
                    distance: endDist,
                    position: 1
                };
            }
        }
    }

    override getPoint(position: number, segment: ArcSegment, segmentStartPoint: Point): Point {
        const { startAngle, deltaAngle } = this.getArcData(segmentStartPoint, segment);
        const finalAngle = startAngle + position * deltaAngle;
        const center = segment.center;
        return {
            x: center.x + segment.radius * Math.cos(finalAngle),
            y: center.y + segment.radius * Math.sin(finalAngle)
        };
    }

    /**
     * Generates additional data for an arc
     *
     * @param segmentStartPoint the start point of the arc
     * @param segment the arc
     * @returns the additional data
     */
    private getArcData(segmentStartPoint: Point, segment: ArcSegment): ArcData {
        const relativeStart = SprottyPoint.subtract(segmentStartPoint, segment.center);
        const relativeEnd = SprottyPoint.subtract(segment.end, segment.center);
        const startAngle = angleOfPoint(relativeStart);
        const endAngle = angleOfPoint(relativeEnd);
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
