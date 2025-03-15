import type { AxisAlignedSegmentEdit, Edit, SplitCanvasAxisAlignedSegmentEdit } from "@hylimo/diagram-protocol";
import { SplitSegmentMoveHandler } from "./splitSegmentMoveHandler.js";
import type { Matrix } from "transformation-matrix";
import type { Point } from "@hylimo/diagram-common";
import { DefaultEditTypes } from "@hylimo/diagram-common";

/**
 * Move handler for splitting a bezier segment
 */
export class SplitAxisAlignedSegmentMoveHandler extends SplitSegmentMoveHandler {
    /**
     * Creats a new SplitAxisAlignedSegmentMoveHandler
     *
     * @param segmentId the id of the segment to split
     * @param pos the pos for the new segment
     * @param nextPos the pos for the next segment
     * @param nextSegmentEdit the edit for the next segment (the segment which was split)
     * @param transformationMatrix matrix applied to event coordinates
     * @param initialPoint the point to use when the mouse was only clicked but not dragged
     */
    constructor(
        private readonly segmentId: string,
        private readonly pos: number,
        private readonly nextPos: number,
        private readonly nextSegmentEdit: AxisAlignedSegmentEdit | undefined,
        transformationMatrix: Matrix,
        initialPoint: Point
    ) {
        super(transformationMatrix, initialPoint);
    }

    override generateSplitSegmentEdits(x: number, y: number): Edit[] {
        const edits: Edit[] = [];
        if (this.nextSegmentEdit !== undefined) {
            edits.push(this.nextSegmentEdit);
        }
        edits.push({
            types: [DefaultEditTypes.SPLIT_CANVAS_AXIS_ALIGNED_SEGMENT],
            values: {
                x,
                y,
                pos: this.pos,
                nextPos: this.nextPos
            },
            elements: [this.segmentId]
        } satisfies SplitCanvasAxisAlignedSegmentEdit);
        return edits;
    }
}
