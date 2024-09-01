/**
 * Default edit types
 */
export enum DefaultEditTypes {
    MOVE_X = "update/move/x",
    MOVE_Y = "update/move/y",

    MOVE_LPOS_POS = "update/move-lpos/pos",
    MOVE_LPOS_DIST = "update/move-lpos/dist",

    RESIZE_WIDTH = "update/resize/width",
    RESIZE_HEIGHT = "update/resize/height",

    AXIS_ALIGNED_SEGMENT_POS = "update/axis-aligned-segment/pos",

    ROTATE = "update/rotate",

    SPLIT_CANVAS_LINE_SEGMENT = "update/split-canvas-line-segment",
    SPLIT_CANVAS_AXIS_ALIGNED_SEGMENT = "update/split-canvas-axis-aligned-segment",
    SPLIT_CANVAS_BEZIER_SEGMENT = "update/split-canvas-bezier-segment"
}
