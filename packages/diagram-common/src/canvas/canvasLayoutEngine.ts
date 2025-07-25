import type { Matrix } from "transformation-matrix";
import { compose, identity, rotateDEG, translate, applyToPoint } from "transformation-matrix";
import { Point } from "../common/point.js";
import type { Line, TransformedLine } from "../line/model/line.js";
import type { Segment } from "../line/model/segment.js";
import { CanvasAxisAlignedSegment } from "../model/elements/canvas/canvasAxisAlignedSegment.js";
import { CanvasBezierSegment } from "../model/elements/canvas/canvasBezierSegment.js";
import { CanvasConnection } from "../model/elements/canvas/canvasConnection.js";
import type { CanvasConnectionSegment } from "../model/elements/canvas/canvasConnectionSegment.js";
import { CanvasElement } from "../model/elements/canvas/canvasElement.js";
import { CanvasLineSegment } from "../model/elements/canvas/canvasLineSegment.js";
import type { MarkerLayoutInformation } from "../model/elements/canvas/marker.js";
import { Marker } from "../model/elements/canvas/marker.js";
import { AxisAlignedSegmentLayoutEngine } from "./axisAlignedSegmentLayoutEngine.js";
import { BezierSegmentLayoutEngine } from "./bezierSegmentLayoutEngine.js";
import type { CanvasConnectionLayout, SegmentLayoutInformation } from "./canvasConnectionLayout.js";
import { LineSegmentLayoutEngine } from "./lineSegmentLayoutEngine.js";
import type { SegmentLayoutEngine } from "./segmentLayoutEngine.js";
import { AbsolutePoint, LinePoint, RelativePoint } from "../model/elements/canvas/canvasPoint.js";
import { LineEngine } from "../line/engine/lineEngine.js";
import type { Element } from "../model/elements/base/element.js";
import { Canvas } from "../model/elements/canvas/canvas.js";

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
 * A point with a context
 */
interface PointWithContext {
    /**
     * The point
     */
    point: Point;
    /**
     * The context of the point
     */
    context: string;
}

/**
 * Helper to layout elements of a canvas
 */
export abstract class CanvasLayoutEngine {
    /**
     * Cache of points
     * Each entry contains the point and the id of the canvas it is part of
     * During computation, a point is set to null to detect circular dependencies
     */
    private readonly points: Map<string, PointWithContext | null> = new Map();

    /**
     * Segment engines to use
     */
    private readonly segmentEngines: Map<string, SegmentLayoutEngine<CanvasConnectionSegment>> = new Map();

    /**
     * Cache of connection layouts
     * During computation, a connection is set to null to detect circular dependencies
     */
    private readonly connectionCache: Map<string, CanvasConnectionLayout | null> = new Map();

    /**
     * Cache of local to ancestor transformations
     */
    private readonly localToAncestorCache: Map<string, Map<string, Matrix>> = new Map();

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
        const context = this.getParentElement(connection.id);
        const cachedConnection = this.connectionCache.get(connection.id);
        if (cachedConnection === null) {
            throw new Error(`Circular dependency detected for connection ${connection.id}`);
        }
        if (cachedConnection != undefined) {
            return cachedConnection;
        }
        this.connectionCache.set(connection.id, null);
        const transformedConnection = this.transformConnection(connection, context);
        const startMarkerInformation = this.layoutStartMarker(transformedConnection, context);
        const endMarkerInformation = this.layoutEndMarker(transformedConnection, context);
        const [line, segmentLayouts] = this.generateLine(
            transformedConnection,
            startMarkerInformation,
            endMarkerInformation,
            context
        );
        const start = line.start;
        const path =
            `M ${start.x} ${start.y}` +
            transformedConnection.segments
                .map((segment, i) => this.generatePathString(segment, segmentLayouts[i], context))
                .join("");
        const resultingConnection = {
            startMarker: startMarkerInformation ?? undefined,
            endMarker: endMarkerInformation ?? undefined,
            line,
            segments: segmentLayouts,
            path
        };
        this.connectionCache.set(connection.id, resultingConnection);
        return resultingConnection;
    }

    /**
     * Layouts a CanvasElement. Is cached.
     *
     * @param element the element to layout
     * @returns the position of the element
     */
    layoutElement(element: CanvasElement): Point {
        return this.getPoint(element.id, this.getParentElement(element.id));
    }

    /**
     * Generates the line for a line provider.
     * For a CanvasElement, it is the outline.
     * For a CanvasConnection, it is the connection line.
     * Does not perform caching.
     * Always uses the parent canvas of the element as context.
     *
     * @param element the element of which to generate the line of
     * @param context the context of which coordinate system to use
     * @returns the generated line
     */
    layoutLine(element: CanvasConnection | CanvasElement, context: string): TransformedLine {
        const elementContext = this.getParentElement(element.id);
        const contextTransformation =
            context != elementContext ? this.localToAncestor(elementContext, context) : identity();
        if (CanvasConnection.isCanvasConnection(element)) {
            const layout = this.layoutConnection(element);
            return {
                line: layout.line,
                transform: contextTransformation
            };
        } else {
            let position: Point;
            if (element.pos != undefined) {
                position = this.getPoint(element.pos, elementContext);
            } else {
                position = Point.ORIGIN;
            }
            return {
                line: element.outline,
                transform: compose(
                    contextTransformation,
                    translate(position.x, position.y),
                    rotateDEG(element.rotation)
                )
            };
        }
    }

    /**
     * Transforms a CanvasConnection to a Connection.
     * Splits the children into their types and evaluates the start point
     *
     * @param connection the connection to transform
     * @param context the context of which coordinate system to use
     * @returns the transformed connection
     */
    private transformConnection(connection: CanvasConnection, context: string): Connection {
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
            start: this.getPoint(connection.start, context),
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
     * @param context the context of which coordinate system to use
     * @returns the generated line and the layout information for each segment
     */
    private generateLine(
        connection: Connection,
        startMarkerInformation: MarkerLayoutInformation | null,
        endMarkerInformation: MarkerLayoutInformation | null,
        context: string
    ): [Line, SegmentLayoutInformation[]] {
        let originalStart = connection.start;
        const start = startMarkerInformation?.newPosition ?? originalStart;
        let startPos = start;
        const segments = connection.segments;
        const layouts = segments.map((segment, i) => {
            let endPos: Point;
            if (i == segments.length - 1) {
                endPos = endMarkerInformation?.newPosition ?? this.getPoint(segment.end, context);
            } else {
                endPos = this.getPoint(segment.end, context);
            }
            const layout = {
                start: startPos,
                end: endPos,
                originalStart,
                originalEnd: this.getPoint(segment.end, context)
            };
            startPos = endPos;
            originalStart = this.getPoint(segment.end, context);
            return layout;
        });
        return [
            {
                start,
                segments: segments.flatMap((segment, i) => this.generateSegments(segment, layouts[i], context)),
                isClosed: false
            },
            layouts
        ];
    }

    /**
     * Layouts the start marker of the connection, if existing
     *
     * @param connection the connection of which to layout the start marker
     * @param context the context of which coordinate system to use
     * @returns the layout information for the start marker, or null if no start marker exists
     */
    private layoutStartMarker(connection: Connection, context: string): MarkerLayoutInformation | null {
        if (connection.startMarker != null) {
            const startSegment = connection.segments[0];
            return this.calculateMarkerRenderInformation(
                startSegment,
                connection.startMarker,
                connection.start,
                context
            );
        } else {
            return null;
        }
    }

    /**
     * Layouts the end marker of the connection, if existing
     *
     * @param connection the connection of which to layout the end marker
     * @param context the context of which coordinate system to use
     * @returns the layout information for the end marker, or null if no end marker exists
     */
    private layoutEndMarker(connection: Connection, context: string): MarkerLayoutInformation | null {
        if (connection.endMarker != null) {
            let endStartPosition: Point;
            const segments = connection.segments;
            if (segments.length == 1) {
                endStartPosition = connection.start;
            } else {
                endStartPosition = this.getPoint(segments.at(-2)!.end, context);
            }
            return this.calculateMarkerRenderInformation(
                segments.at(-1)!,
                connection.endMarker,
                endStartPosition,
                context
            );
        } else {
            return null;
        }
    }

    /**
     * Gets the point a canvas point is positioned at.
     *
     * @param id the id of the point to get
     * @param context the context of which coordinate system to use
     * @returns the point the canvas point is positioned at
     */
    getPoint(id: string, context: string): Point {
        const cachedPoint = this.points.get(id);
        if (cachedPoint === null) {
            throw new Error(`Circular dependency detected for point ${id}`);
        }
        if (cachedPoint != undefined) {
            return this.computePointForContext(cachedPoint, context);
        }
        this.points.set(id, null);
        this.points.set(id, this.getPointInternal(id));
        return this.computePointForContext(this.points.get(id)!, context);
    }

    /**
     * Computes the point relative to a coordinate system of given context
     *
     * @param point the point to compute
     * @param context the context of which coordinate system to use
     * @returns the computed point
     */
    private computePointForContext(point: PointWithContext, context: string): Point {
        if (point.context == context) {
            return point.point;
        }
        const matrix = this.localToAncestor(point.context, context);
        return applyToPoint(matrix, point.point);
    }

    /**
     * Gets the point a canvas point is positioned at.
     *
     * @param id the id of the point or canvas element to get
     * @returns the point and the id of the canvas to which the point is relative to
     */
    private getPointInternal(pointId: string): PointWithContext {
        const element = this.getElement(pointId);
        const context = this.getParentElement(pointId);
        let point: Point;
        if (element == null) {
            throw new Error(`Point with id ${pointId} not found`);
        }
        if (AbsolutePoint.isAbsolutePoint(element)) {
            point = { x: element.x, y: element.y };
        } else if (RelativePoint.isRelativePoint(element)) {
            const targetX = this.getPoint(element.targetX, context);
            const targetY = this.getPoint(element.targetY, context);
            point = { x: targetX.x + element.offsetX, y: targetY.y + element.offsetY };
        } else if (LinePoint.isLinePoint(element)) {
            const lineProvider = this.getElement(element.lineProvider);
            const line = this.layoutLine(lineProvider as CanvasConnection | CanvasElement, context);
            point = LineEngine.DEFAULT.getPoint(element.pos, element.segment, element.distance ?? 0, line);
        } else if (CanvasElement.isCanvasElement(element)) {
            if (element.pos != undefined) {
                point = this.getPoint(element.pos, context);
            } else {
                point = Point.ORIGIN;
            }
        } else if (CanvasConnection.isCanvasConnection(element)) {
            point = this.getCanvasConnectionEnd(element, context);
        } else {
            throw new Error(`Unknown point type: ${element.type}`);
        }
        return { point, context };
    }

    /**
     * Gets the end point of a canvas connection
     *
     * @param connection the connection to get the end point of
     * @param context the context of which coordinate system to use
     * @returns the end point of the connection
     */
    private getCanvasConnectionEnd(connection: CanvasConnection, context: string): Point {
        const segments = connection.children;
        for (let i = segments.length - 1; i >= 0; i--) {
            if ("end" in segments[i]) {
                return this.getPoint((segments[i] as CanvasConnectionSegment).end, context);
            }
        }
        throw new Error(`Connection ${connection.id} does not have a single segment`);
    }

    /**
     * Calculates the MarkerRenderInformation for a marker
     *
     * @param marker the marker
     * @param start the start of this segment
     * @param context the context of which coordinate system to use
     * @returns the calculated MarkerRenderInformation
     */
    private calculateMarkerRenderInformation(
        segment: CanvasConnectionSegment,
        marker: Marker,
        start: Point,
        context: string
    ): MarkerLayoutInformation {
        return this.segmentEngines.get(segment.type)!.calculateMarkerRenderInformation(segment, marker, start, context);
    }

    /**
     * Generates an svg path string with absolute positions for this segment
     *
     * @param segment the segment to use
     * @param layout defines the segment start and end points
     * @param context the context of which coordinate system to use
     * @return the generated path string
     */
    private generatePathString(
        segment: CanvasConnectionSegment,
        layout: SegmentLayoutInformation,
        context: string
    ): string {
        return this.segmentEngines.get(segment.type)!.generatePathString(segment, layout, context);
    }

    /**
     * Generates the line segments for path points
     *
     * @param segment the segment to use
     * @param layout defines the segment start and end points
     * @param context the context of which coordinate system to use
     * @return the generated line segments
     */
    private generateSegments(
        segment: CanvasConnectionSegment,
        layout: SegmentLayoutInformation,
        context: string
    ): Segment[] {
        return this.segmentEngines.get(segment.type)!.generateSegments(segment, layout, context);
    }

    /**
     * Calculates a transformation matrix to transform from the local coordinate system of the element to the parent coordinate system
     *
     * @param element the element to transform from
     * @returns the transformation matrix or undefined if no transformation is needed
     */
    localToParent(element: Element): Matrix | undefined {
        switch (element.type) {
            case CanvasElement.TYPE: {
                const pos = this.layoutElement(element as CanvasElement);
                const canvasElement = element as CanvasElement;
                return compose(translate(pos.x, pos.y), rotateDEG(canvasElement.rotation));
            }
            case Marker.TYPE: {
                const marker = element as Marker;
                const parent = this.getElement(this.getParentElement(element.id)) as CanvasConnection;
                const connection = this.layoutConnection(parent);
                const layoutInformation = marker.pos == "start" ? connection.startMarker! : connection.endMarker!;
                return compose(
                    translate(layoutInformation.position.x, layoutInformation.position.y),
                    rotateDEG(layoutInformation.rotation)
                );
            }
            case Canvas.TYPE: {
                const canvas = element as Canvas;
                return translate(canvas.dx, canvas.dy);
            }
            default: {
                return undefined;
            }
        }
    }

    /**
     * Calculates a transformation matrix to transform from the local coordinate system of the element to the ancestor coordinate system
     *
     * @param from the id of the element to transform from
     * @param to the id of the element to transform to
     * @returns the transformation matrix
     */
    localToAncestor(from: string, to: string): Matrix {
        let fromEntry = this.localToAncestorCache.get(from);
        if (fromEntry != undefined) {
            const result = fromEntry.get(to);
            if (result != undefined) {
                return result;
            }
        } else {
            fromEntry = new Map();
            this.localToAncestorCache.set(from, fromEntry);
        }
        const matrices = [];
        let current = this.getElement(from);
        while (current.id != to) {
            const matrix = this.localToParent(current);
            if (matrix != undefined) {
                matrices.push(matrix);
            }
            current = this.getElement(this.getParentElement(current.id));
        }
        matrices.reverse();
        const result = matrices.length > 0 ? compose(...matrices) : identity();
        fromEntry.set(to, result);
        return result;
    }

    /**
     * Gets an element in the canvas by its id
     *
     * @param id the id of the element to get
     * @returns the element
     */
    abstract getElement(id: string): Element;

    /**
     * Gets the id of the parent element of the given element
     * May throw an error if a parent element does not exist
     *
     * @param element the id of the element to get the parent of
     * @returns the id of the parent element
     */
    abstract getParentElement(element: string): string;
}
