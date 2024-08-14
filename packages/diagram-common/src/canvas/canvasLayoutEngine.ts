import { compose, identity, rotateDEG, translate } from "transformation-matrix";
import { Point } from "../common/point.js";
import { Line, TransformedLine } from "../line/model/line.js";
import { Segment } from "../line/model/segment.js";
import { CanvasAxisAlignedSegment } from "../model/elements/canvas/canvasAxisAlignedSegment.js";
import { CanvasBezierSegment } from "../model/elements/canvas/canvasBezierSegment.js";
import { CanvasConnection } from "../model/elements/canvas/canvasConnection.js";
import { CanvasConnectionSegment } from "../model/elements/canvas/canvasConnectionSegment.js";
import { CanvasElement } from "../model/elements/canvas/canvasElement.js";
import { CanvasLineSegment } from "../model/elements/canvas/canvasLineSegment.js";
import { Marker, MarkerLayoutInformation } from "../model/elements/canvas/marker.js";
import { AxisAlignedSegmentLayoutEngine } from "./axisAlignedSegmentLayoutEngine.js";
import { BezierSegmentLayoutEngine } from "./bezierSegmentLayoutEngine.js";
import { CanvasConnectionLayout, SegmentLayoutInformation } from "./canvasConnectionLayout.js";
import { LineSegmentLayoutEngine } from "./lineSegmentLayoutEngine.js";
import { SegmentLayoutEngine } from "./segmentLayoutEngine.js";
import { AbsolutePoint, CanvasPoint, LinePoint, RelativePoint } from "../model/elements/canvas/canvasPoint.js";
import { LineEngine } from "../line/engine/lineEngine.js";

/**
 * Connection, where the start point has been evaluated, and the children split into their types
 */
interface Connection {
    /**
     * The start point of the connection
     */
    start: Point;
    /**
     * If existing, the marker at the start of the connection
     */
    startMarker?: Marker;
    /**
     * If existing, the marker at the end of the connection
     */
    endMarker?: Marker;
    /**
     * The segments the connection consists of, at least one
     */
    segments: CanvasConnectionSegment[];
}

/**
 * Helper to layout elements of a canvas
 */
export abstract class CanvasLayoutEngine {
    /**
     * Cache of points
     */
    private readonly points: Map<string, Point> = new Map();

    /**
     * Segment engines to use
     */
    private readonly segmentEngines: Map<string, SegmentLayoutEngine<CanvasConnectionSegment>> = new Map();
    /**
     * Cache of connection layouts
     */
    private readonly connectionCache: Map<string, CanvasConnectionLayout> = new Map();

    /**
     * Creates a new instance of CanvasLayoutEngine.
     */
    constructor() {
        this.segmentEngines.set(CanvasLineSegment.TYPE, new LineSegmentLayoutEngine(this));
        this.segmentEngines.set(CanvasBezierSegment.TYPE, new BezierSegmentLayoutEngine(this));
        this.segmentEngines.set(CanvasAxisAlignedSegment.TYPE, new AxisAlignedSegmentLayoutEngine(this));
    }

    /**
     * Layouts a CanvasConnection. Is cached.
     *
     * @param connection the connection to layout
     * @returns the generated layout information
     */
    layoutConnection(connection: CanvasConnection): CanvasConnectionLayout {
        if (!this.connectionCache.has(connection.id)) {
            const transformedConnection = this.transformConnection(connection);
            const startMarkerInformation = this.layoutStartMarker(transformedConnection);
            const endMarkerInformation = this.layoutEndMarker(transformedConnection);
            const [line, segmentLayouts] = this.generateLine(
                transformedConnection,
                startMarkerInformation,
                endMarkerInformation
            );
            const start = line.start;
            const path =
                `M ${start.x} ${start.y}` +
                transformedConnection.segments
                    .map((segment, i) => this.generatePathString(segment, segmentLayouts[i]))
                    .join("");
            this.connectionCache.set(connection.id, {
                startMarker: startMarkerInformation ?? undefined,
                endMarker: endMarkerInformation ?? undefined,
                line,
                segments: segmentLayouts,
                path
            });
        }
        return this.connectionCache.get(connection.id)!;
    }

    /**
     * Generates the line for a line provider.
     * For a CanvasElement, it is the outline.
     * For a CanvasConnection, it is the connection line.
     * Does not perform caching.
     *
     * @param element the element of which to generate the line of
     * @returns the generated line
     */
    layoutLine(element: CanvasConnection | CanvasElement): TransformedLine {
        if (CanvasConnection.isCanvasConnection(element)) {
            const layout = this.layoutConnection(element);
            return {
                line: layout.line,
                transform: identity()
            };
        } else {
            let position: Point;
            if (element.pos != undefined) {
                position = this.getPoint(element.pos);
            } else {
                position = Point.ORIGIN;
            }
            return {
                line: element.outline,
                transform: compose(translate(position.x, position.y), rotateDEG(element.rotation))
            };
        }
    }

    /**
     * Transforms a CanvasConnection to a Connection.
     * Splits the children into their types and evaluates the start point
     *
     * @param connection the connection to transform
     * @returns the transformed connection
     */
    private transformConnection(connection: CanvasConnection): Connection {
        let startMarker: Marker | undefined;
        let endMarker: Marker | undefined;
        const segments: CanvasConnectionSegment[] = [];
        for (const child of connection.children) {
            if (Marker.isMarker(child)) {
                if (child.pos == "start") {
                    startMarker = child;
                } else {
                    endMarker = child;
                }
            } else {
                segments.push(child as CanvasConnectionSegment);
            }
        }
        return {
            start: this.getPoint(connection.start),
            startMarker,
            endMarker,
            segments
        };
    }

    /**
     * Generates a Line from a Connection. Also generates the layout information for each segment.
     *
     * @param connection the connection to generate the line from
     * @param startMarkerInformation layout information for the start marker
     * @param endMarkerInformation layout information for the end marker
     * @returns the generated line and the layout information for each segment
     */
    private generateLine(
        connection: Connection,
        startMarkerInformation: MarkerLayoutInformation | null,
        endMarkerInformation: MarkerLayoutInformation | null
    ): [Line, SegmentLayoutInformation[]] {
        let originalStart = connection.start;
        const start = startMarkerInformation?.newPosition ?? originalStart;
        let startPos = start;
        const segments = connection.segments;
        const layouts = segments.map((segment, i) => {
            let endPos: Point;
            if (i == segments.length - 1) {
                endPos = endMarkerInformation?.newPosition ?? this.getPoint(segment.end);
            } else {
                endPos = this.getPoint(segment.end);
            }
            const layout = {
                start: startPos,
                end: endPos,
                originalStart,
                originalEnd: this.getPoint(segment.end)
            };
            startPos = endPos;
            originalStart = this.getPoint(segment.end);
            return layout;
        });
        return [
            {
                start,
                segments: segments.flatMap((segment, i) => this.generateSegments(segment, layouts[i]))
            },
            layouts
        ];
    }

    /**
     * Layouts the start marker of the connection, if existing
     *
     * @param connection the connection of which to layout the start marker
     * @returns the layout information for the start marker, or null if no start marker exists
     */
    private layoutStartMarker(connection: Connection): MarkerLayoutInformation | null {
        if (connection.startMarker != null) {
            const startSegment = connection.segments[0];
            return this.calculateMarkerRenderInformation(startSegment, connection.startMarker, connection.start);
        } else {
            return null;
        }
    }

    /**
     * Layouts the end marker of the connection, if existing
     *
     * @param connection the connection of which to layout the end marker
     * @returns the layout information for the end marker, or null if no end marker exists
     */
    private layoutEndMarker(connection: Connection): MarkerLayoutInformation | null {
        if (connection.endMarker != null) {
            let endStartPosition: Point;
            const segments = connection.segments;
            if (segments.length == 1) {
                endStartPosition = connection.start;
            } else {
                endStartPosition = this.getPoint(segments.at(-2)!.end);
            }
            return this.calculateMarkerRenderInformation(segments.at(-1)!, connection.endMarker, endStartPosition);
        } else {
            return null;
        }
    }

    /**
     * Gets the point a canvas point is positioned at.
     *
     * @param id the id of the point to get
     * @returns the point the canvas point is positioned at
     */
    getPoint(id: string): Point {
        if (!this.points.has(id)) {
            this.points.set(id, this.getPointInternal(id));
        }
        return this.points.get(id)!;
    }

    /**
     * Gets the point a canvas point is positioned at.
     *
     * @param id the id of the point or canvas element to get
     * @returns the point the canvas point is positioned at
     */
    getPointInternal(pointId: string): Point {
        const element = this.getElement(pointId);
        if (element == null) {
            throw new Error(`Point with id ${pointId} not found`);
        }
        if (AbsolutePoint.isAbsolutePoint(element)) {
            return { x: element.x, y: element.y };
        } else if (RelativePoint.isRelativePoint(element)) {
            const target = this.getPoint(element.target);
            return { x: target.x + element.offsetX, y: target.y + element.offsetY };
        } else if (LinePoint.isLinePoint(element)) {
            const lineProvider = this.getElement(element.lineProvider);
            const line = this.layoutLine(lineProvider as CanvasConnection | CanvasElement);
            return LineEngine.DEFAULT.getPoint(element.pos, element.segment, element.distance ?? 0, line);
        } else if (CanvasElement.isCanvasElement(element)) {
            if (element.pos != undefined) {
                return this.getPoint(element.pos);
            } else {
                return Point.ORIGIN;
            }
        } else {
            throw new Error(`Unknown point type: ${element.type}`);
        }
    }

    /**
     * Calculates the MarkerRenderInformation for a marker
     *
     * @param marker the marker
     * @param start the start of this segment
     */
    private calculateMarkerRenderInformation(
        segment: CanvasConnectionSegment,
        marker: Marker,
        start: Point
    ): MarkerLayoutInformation {
        return this.segmentEngines.get(segment.type)!.calculateMarkerRenderInformation(segment, marker, start);
    }

    /**
     * Generates an svg path string with absolute positions for this segment
     *
     * @param layout defines the segment start and end points
     * @return the generated path string
     */
    private generatePathString(segment: CanvasConnectionSegment, layout: SegmentLayoutInformation): string {
        return this.segmentEngines.get(segment.type)!.generatePathString(segment, layout);
    }

    /**
     * Generates the line segments for path points
     *
     * @param layout defines the segment start and end points
     * @return the generated line segments
     */
    private generateSegments(segment: CanvasConnectionSegment, layout: SegmentLayoutInformation): Segment[] {
        return this.segmentEngines.get(segment.type)!.generateSegments(segment, layout);
    }

    /**
     * Gets an element in the canvas by its id
     *
     * @param id the id of the element to get
     */
    abstract getElement(id: string): CanvasElement | CanvasConnection | CanvasPoint;
}
