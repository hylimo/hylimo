import { applyToPoint, compose, decomposeTSR, inverse, rotate, scale } from "transformation-matrix";
import { Point } from "../../common/point.js";
import { LinePoint } from "../../model/elements/canvas/canvasPoint.js";
import { ArcSegment } from "../model/arcSegment.js";
import { BezierSegment } from "../model/bezierSegment.js";
import { Line, TransformedLine } from "../model/line.js";
import { LineSegment } from "../model/lineSegment.js";
import { Segment } from "../model/segment.js";
import { ArcSegmentEngine } from "./arcSegmentEngine.js";
import { BezierSegmentEngine } from "./bezierSegmentEngine.js";
import { LineSegmentEngine } from "./lineSegmentEngine.js";
import { SegmentEngine } from "./segmentEngine.js";

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
        [BezierSegment.TYPE, new BezierSegmentEngine()],
        [ArcSegment.TYPE, new ArcSegmentEngine()]
    ]);

    /**
     * Finds the nearest point on the provided line to point.
     *
     * @param point the point to which the nearest point should be found
     * @param transformedLine line with associated transform
     * @returns the position of the closest point on the line
     */
    projectPoint(point: Point, transformedLine: TransformedLine): ProjectionResult {
        const { line, transform } = transformedLine;
        if (line.segments.length == 0) {
            return {
                pos: 0,
                relativePos: 0,
                segment: 0,
                distance: 0
            };
        }
        const localPoint = applyToPoint(inverse(transform), point);
        const lengthPerSegment = 1 / line.segments.length;
        let minDistance = Number.POSITIVE_INFINITY;
        let relativePosition = 0;
        let segmentIndex = 0;
        let distance = 0;
        let startPosition = line.start;
        for (let i = 0; i < line.segments.length; i++) {
            const segment = line.segments[i];
            const engine = this.getEngine(segment);
            const candidate = engine.projectPoint(localPoint, segment, startPosition);
            if (candidate.distance < minDistance) {
                minDistance = candidate.distance;
                relativePosition = candidate.position;
                segmentIndex = i;
                const normal = engine.getNormalVector(candidate.position, segment, startPosition);
                const d2 = normal.x ** 2 + normal.y ** 2;
                distance =
                    ((localPoint.x - candidate.point.x) * normal.x + (localPoint.y - candidate.point.y) * normal.y) /
                    d2;
            }
            startPosition = segment.end;
        }
        return {
            pos: lengthPerSegment * (segmentIndex + relativePosition),
            relativePos: relativePosition,
            segment: segmentIndex,
            distance
        };
    }

    /**
     * Gets a point on a segment
     *
     * @param position the position of the point on the segment, a number between 0 and 1
     * @param segment the segment to which position is relative to (if undefined position is relative to the whole line)
     * @param distance the distance to the line at which the point should be located
     * @param transformedLine line with associated transform
     * @returns the point on the line
     */
    getPoint(position: number, segment: number | undefined, distance: number, transformedLine: TransformedLine): Point {
        const { line, transform } = transformedLine;
        const { relativePosition, segment: segmentIndex } = this.normalizePosition(position, segment, line);
        const segmentStartPos = segmentIndex == 0 ? line.start : line.segments[segmentIndex - 1].end;
        const lineSegment = line.segments[segmentIndex];
        const engine = this.getEngine(lineSegment);
        const localPoint = engine.getPoint(relativePosition, distance, lineSegment, segmentStartPos);
        return applyToPoint(transform, localPoint);
    }

    /**
     * Gets the normal vector for a point on a segment
     *
     * @param position the position of the point on the segment, a number between 0 and 1
     * @param segment the segment to which position is relative to (if undefined position is relative to the whole line)
     * @param transformedLine line with associated transform
     * @returns the normal vector
     */
    getNormalVector(position: number, segment: number | undefined, transformedLine: TransformedLine): Point {
        const { line, transform } = transformedLine;
        const { relativePosition, segment: segmentIndex } = this.normalizePosition(position, segment, line);
        const segmentStartPos = segmentIndex == 0 ? line.start : line.segments[segmentIndex - 1].end;
        const lineSegment = line.segments[segmentIndex];
        const engine = this.getEngine(line.segments[segmentIndex]);
        const localVector = engine.getNormalVector(relativePosition, lineSegment, segmentStartPos);
        const {
            scale: { sx, sy },
            rotation: { angle }
        } = decomposeTSR(transform);
        return applyToPoint(compose(scale(sx, sy), rotate(angle)), localVector);
    }

    /**
     * Normalizes the position and segment index
     * If the segment does not exist, the position is normalized to the closest existing segment
     *
     * @param position the position of the point on the segment, a number between 0 and 1
     * @param segment the segment to which position is relative to (if undefined position is relative to the whole line)
     * @param line the line to normalize the position for
     * @returns the normalized position and segment index
     */
    private normalizePosition(
        position: number,
        segment: number | undefined,
        line: Line
    ): { relativePosition: number; segment: number } {
        if (line.segments.length == 0) {
            return { relativePosition: 0, segment: 0 };
        }
        let segmentIndex: number;
        let relativePosition: number;
        if (segment != undefined) {
            segmentIndex = Math.min(Math.max(Math.round(segment), 0), line.segments.length - 1);
            relativePosition = position;
        } else {
            segmentIndex = LinePoint.calcSegmentIndex(position, line.segments.length);
            relativePosition = position * line.segments.length - segmentIndex;
        }
        if (!this.doesSegmentExist(line, segmentIndex)) {
            for (let i = segmentIndex - 1; i >= 0; i--) {
                if (this.doesSegmentExist(line, i)) {
                    return { relativePosition: 1, segment: i };
                }
            }
            for (let i = segmentIndex + 1; i < line.segments.length; i++) {
                if (this.doesSegmentExist(line, i)) {
                    return { relativePosition: 0, segment: i };
                }
            }
        }
        return { relativePosition, segment: segmentIndex };
    }

    /**
     * Gets the SVG path for a line
     *
     * @param line the line to get the path for
     * @returns the SVG path
     */
    getSvgPath(line: Line): string {
        let path = `M ${line.start.x} ${line.start.y}`;
        let startPosition = line.start;
        for (const segment of line.segments) {
            const engine = this.getEngine(segment);
            path += ` ${engine.toSvgPath(segment, startPosition)}`;
            startPosition = segment.end;
        }
        return path;
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

    /**
     * Checks if a segment exists
     *
     * @param line the line to check
     * @param segmentIndex the index of the segment to check
     * @returns true if the segment exists
     */
    private doesSegmentExist(line: Line, segmentIndex: number): boolean {
        if (segmentIndex < 0 || segmentIndex >= line.segments.length) {
            return false;
        }
        const segment = line.segments[segmentIndex];
        const startPosition = segmentIndex == 0 ? line.start : line.segments[segmentIndex - 1].end;
        const engine = this.getEngine(segment);
        return engine.exists(segment, startPosition);
    }
}

/**
 * Result of a point projection
 */
export interface ProjectionResult {
    /**
     * Position on the line which is closest to the provided point
     */
    pos: number;
    /**
     * The relative position on the segment
     */
    relativePos: number;
    /**
     * The segment index
     */
    segment: number;
    /**
     * Distance for relative LinePoints.
     * This is the distance to the line which results in the lowest distance to the point.
     * This is not the distance to the provided point!
     */
    distance: number;
}
