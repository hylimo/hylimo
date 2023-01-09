import { Element } from "../element";

/**
 * Connection on a Canvas with an arbitrary amount of segments
 * Must only have CanvasConnectionSegment
 */
export interface CanvasConnection extends Element {}

/**
 * Connection line segment
 */
export interface CanvasConnectionSegment extends Element {
    /**
     * The type of the segment
     */
    type: "line" | "bezier";
    /**
     * The id of the start point
     */
    start: string;
    /**
     * The id of the end point
     */
    end: string;
}

/**
 * Direct line connection segment
 */
export interface CanvasLineSegment extends CanvasConnectionSegment {
    type: "line";
}

/**
 * Cubic bezier connection segment
 */
export interface CanvasBezierSegment extends CanvasConnectionSegment {
    type: "bezier";
    /**
     * The id of the start control point
     */
    startControlPoint: string;
    /**
     * The id of the end control point
     */
    endControlPoint: string;
}
