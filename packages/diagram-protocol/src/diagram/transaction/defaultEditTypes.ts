import { DefaultEditTypes } from "@hylimo/diagram-common";
import { Edit } from "./edit.js";

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
export type ToolboxEdit = Edit<{ x: number; y: number; prediction?: boolean }, `toolbox/${string}`>;
