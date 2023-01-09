import { Point } from "../../common/point";

/**
 * Named point on a canvas
 */
export interface CanvasPoint {
    id: string;
    /**
     * If true, this point can be manipulated
     */
    editable: boolean;
}

/**
 * Absolute point on a canvas consisting of an x and y coordinate
 */
export interface AbsolutePoint extends Point, CanvasPoint {}

/**
 * Relative point, dependent on a point and offset in both x and y direction
 */
export interface RelativePoint extends CanvasPoint {
    /**
     * The id of the point this is relative of
     */
    dependency: string;
    /**
     * The offset in x direction
     */
    offsetX: number;
    /**
     * The offset in y direction
     */
    offsetY: number;
}

/**
 * Point on a line, consisting of the id of a line provider and the position on the line
 */
export interface LinePoint extends CanvasPoint {
    /**
     * The id of the CanvasElement or CanvasConnection which provides the line
     */
    lineProvider: string;
    /**
     * The position where on the line the point is located, between 0 and 1
     */
    position: number;
}
