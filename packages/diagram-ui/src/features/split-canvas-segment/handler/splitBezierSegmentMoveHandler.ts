import type { Edit, SplitCanvasBezierSegmentEdit } from "@hylimo/diagram-protocol";
import { SplitSegmentMoveHandler } from "./splitSegmentMoveHandler.js";
import type { Matrix } from "transformation-matrix";
import type { Point } from "@hylimo/diagram-common";
import { DefaultEditTypes } from "@hylimo/diagram-common";

/**
 * Move handler for splitting a bezier segment
 */
export class SplitBezierSegmentMoveHandler extends SplitSegmentMoveHandler {
    /**
     * Creats a new SplitBezierSegmentMoveHandler
     *
     * @param segmentId the id of the segment to split
     * @param cx1 the relative x coordinate of the first control point
     * @param cy1 the relative y coordinate of the first control point
     * @param cx2 the relative x coordinate of the second control point
     * @param cy2 the relative y coordinate of the second control point
     * @param transformationMatrix matrix applied to event coordinates
     * @param initialPoint the point to use when the mouse was only clicked but not dragged
     */
    constructor(
        private readonly segmentId: string,
        private readonly cx1: number,
        private readonly cy1: number,
        private readonly cx2: number,
        private readonly cy2: number,
        transformationMatrix: Matrix,
        initialPoint: Point
    ) {
        super(transformationMatrix, initialPoint);
    }

    override generateSplitSegmentEdits(x: number, y: number): Edit[] {
        const edit: SplitCanvasBezierSegmentEdit = {
            types: [DefaultEditTypes.SPLIT_CANVAS_BEZIER_SEGMENT],
            values: {
                x,
                y,
                cx1: this.cx1,
                cy1: this.cy1,
                cx2: this.cx2,
                cy2: this.cy2
            },
            elements: [this.segmentId]
        };
        return [edit];
    }
}
