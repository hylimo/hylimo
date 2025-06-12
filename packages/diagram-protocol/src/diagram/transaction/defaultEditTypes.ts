import type { DefaultEditTypes, Point } from "@hylimo/diagram-common";
import type { Edit } from "./edit.js";

/**
 * Move edit
 */
export type MoveEdit = Edit<{ dx: number; dy: number }, DefaultEditTypes.MOVE_X | DefaultEditTypes.MOVE_Y>;

/**
 * Line point move edit
 */
export type MoveLposEdit = Edit<
    { pos: number | [number, number]; dist: number },
    DefaultEditTypes.MOVE_LPOS_POS | DefaultEditTypes.MOVE_LPOS_DIST
>;

/**
 * Resize edit
 */
export type ResizeEdit = Edit<
    { width?: number; height?: number; dw?: number; dh?: number },
    DefaultEditTypes.RESIZE_WIDTH | DefaultEditTypes.RESIZE_HEIGHT
>;

/**
 * Axis aligned segment edit
 */
export type AxisAlignedSegmentEdit = Edit<{ pos: number }, DefaultEditTypes.AXIS_ALIGNED_SEGMENT_POS>;

/**
 * Rotate edit
 */
export type RotateEdit = Edit<{ rotation: number }, DefaultEditTypes.ROTATE>;

/**
 * Split canvas line segment edit
 */
export type SplitCanvasLineSegmentEdit = Edit<{ x: number; y: number }, DefaultEditTypes.SPLIT_CANVAS_LINE_SEGMENT>;

/**
 * Split canvas axis aligned segment edit
 */
export type SplitCanvasAxisAlignedSegmentEdit = Edit<
    { x: number; y: number; pos: number; nextPos: number },
    DefaultEditTypes.SPLIT_CANVAS_AXIS_ALIGNED_SEGMENT
>;

/**
 * Split canvas bezier segment edit
 */
export type SplitCanvasBezierSegmentEdit = Edit<
    { x: number; y: number; cx1: number; cy1: number; cx2: number; cy2: number },
    DefaultEditTypes.SPLIT_CANVAS_BEZIER_SEGMENT
>;

/**
 * Toolbox edit
 */
export type ToolboxEdit = Edit<
    { x: number; y: number; prediction?: boolean; expression?: string },
    `toolbox/${string}`
>;

/**
 * Start/end for a connection created by a connection edit.
 * - x/y coordinates are in the root coordinate system
 * - optional: expression and pos for a target to snap to
 */
export type ConnectionEnd = Point &
    (
        | {
              /**
               * Expression evaluating to a CanvasConnection or CanvasElement
               */
              expression: string;
              /**
               * Position on the line the element provides
               */
              pos: number;
          }
        | object
    );

/**
 * Connection edit
 */
export type ConnectionEdit = Edit<
    { start: ConnectionEnd; end: ConnectionEnd; prediction?: boolean },
    `connection/${string}`
>;
