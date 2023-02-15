import { Math2D } from "../../common/math";
import { Point } from "../../common/point";
import { ArcSegment } from "../model/arcSegment";
import { NearestPointResult, SegmentEngine } from "./segmentEngine";

/**
 * Segment engine for ArcSegment
 */
export class ArcSegmentEngine extends SegmentEngine<ArcSegment> {
    override projectPoint(point: Point, segment: ArcSegment, segmentStartPoint: Point): NearestPointResult {
        const { startAngle, deltaAngle } = this.getArcData(segmentStartPoint, segment);
        const endAngle = startAngle + deltaAngle;
        const position = (x: number) => ({
            x: segment.center.x + segment.radius * Math.cos(x),
            y: segment.center.y + segment.radius * Math.sin(x)
        });
        const dist = (x: number) => {
            const delta = Math2D.sub(point, position(x));
            return Math2D.length(delta);
        };
        const angle = Math2D.angle(Math2D.sub(point, segment.center));
        let deltaPointAngle = angle - startAngle;
        if (deltaPointAngle < 0 && deltaAngle > 0) {
            deltaPointAngle += 2 * Math.PI;
        } else if (deltaAngle > 0 && deltaAngle < 0) {
            deltaPointAngle -= 2 * Math.PI;
        }
        if (Math.abs(deltaPointAngle) < Math.abs(deltaAngle)) {
            return {
                distance: dist(angle),
                position: deltaPointAngle / deltaAngle,
                point: position(angle)
            };
        } else {
            const startDist = dist(startAngle);
            const endDist = dist(endAngle);
            if (startDist < endDist) {
                return {
                    distance: startDist,
                    position: 0,
                    point: position(startAngle)
                };
            } else {
                return {
                    distance: endDist,
                    position: 1,
                    point: position(endAngle)
                };
            }
        }
    }

    override getPoint(position: number, distance: number, segment: ArcSegment, segmentStartPoint: Point): Point {
        const { startAngle, deltaAngle } = this.getArcData(segmentStartPoint, segment);
        const finalAngle = startAngle + position * deltaAngle;
        const center = segment.center;
        return {
            x: center.x + (segment.radius + distance) * Math.cos(finalAngle),
            y: center.y + (segment.radius + distance) * Math.sin(finalAngle)
        };
    }

    override getNormalVector(position: number, segment: ArcSegment, segmentStartPoint: Point): Point {
        const { startAngle, deltaAngle } = this.getArcData(segmentStartPoint, segment);
        const finalAngle = startAngle + position * deltaAngle;
        return {
            x: Math.cos(finalAngle),
            y: Math.sin(finalAngle)
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
