import { Point } from "../../common/point";
import { BezierSegment } from "../model/bezierSegment";
import { Line, LineTransform, TransformedLine } from "../model/line";
import { LineSegment } from "../model/lineSegment";
import { Segment } from "../model/segment";
import { BezierSegmentEngine } from "./bezierSegmentEngine";
import { LineSegmentEngine } from "./lineSegmentEngine";
import { SegmentEngine } from "./segmentEngine";

/**
 * Helper to get closest points to a line, and calculate the position of a point on the line
 */
export class LineEngine {
    /**
     * Default instance, can be shared as the engine is stateless
     */
    static DEFAULT = new LineEngine();

    /**
     * Map of all known engines
     */
    private engines = new Map<string, SegmentEngine<any>>([
        [LineSegment.TYPE, new LineSegmentEngine()],
        [BezierSegment.TYPE, new BezierSegmentEngine()]
    ]);

    /**
     * Finds the nearest point on the provided line to point.
     *
     * @param point the point to which the nearest point should be found
     * @param transformedLine line with associated transform
     * @returns the position of the closest point on the line
     */
    getNearestPoint(point: Point, transformedLine: TransformedLine): number {
        const { line, transform } = transformedLine;
        if (line.segments.length == 0) {
            return 0;
        }
        const localPoint = LineTransform.inverseTransform(transform, point);
        const lengthPerSegment = 1 / line.segments.length;
        let minDistance = Number.POSITIVE_INFINITY;
        let position = 0;
        let startPosition = line.start;
        for (let i = 0; i < line.segments.length; i++) {
            const segment = line.segments[i];
            const engine = this.getEngine(segment);
            const candidate = engine.getNearestPoint(localPoint, segment, startPosition);
            if (candidate.distance < minDistance) {
                minDistance = candidate.distance;
                position = lengthPerSegment * (i + candidate.position);
            }
            startPosition = segment.end;
        }
        return position;
    }

    /**
     * Gets a point on a segment
     *
     * @param position the position of the point on the segment, a number between 0 and 1
     * @param transformedLine line with associated transform
     * @returns the point on the line
     */
    getPoint(position: number, transformedLine: TransformedLine): Point {
        const { line, transform } = transformedLine;
        if (line.segments.length == 0) {
            return line.start;
        }
        const segmentIndex = Math.min(Math.floor(position * line.segments.length), line.segments.length - 1);
        const segmentStartPos = segmentIndex == 0 ? line.start : line.segments[segmentIndex - 1].end;
        const segment = line.segments[segmentIndex];
        const engine = this.getEngine(segment);
        const localPoint = engine.getPoint(position * line.segments.length - segmentIndex, segment, segmentStartPos);
        return LineTransform.transform(transform, localPoint);
    }

    /**
     * Gets the engine associated with the segment
     *
     * @param segment the segment to get the engine for
     * @returns the found engine
     */
    private getEngine<T extends Segment>(segment: T): SegmentEngine<T> {
        const engine = this.engines.get(segment.type);
        if (engine) {
            return engine;
        } else {
            throw new Error(`Unknown segment type: ${segment.type}`);
        }
    }
}
