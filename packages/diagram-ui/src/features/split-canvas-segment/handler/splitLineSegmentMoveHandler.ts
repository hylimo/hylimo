import { Edit, SplitCanvasLineSegmentEdit } from "@hylimo/diagram-protocol";
import { SplitSegmentMoveHandler } from "./splitSegmentMoveHandler.js";
import { Matrix } from "transformation-matrix";
import { DefaultEditTypes, Point } from "@hylimo/diagram-common";

/**
 * Move handler for splitting a canvas line segment
 */
export class SplitLineSegmentMoveHandler extends SplitSegmentMoveHandler {
    /**
     * Creates a new SplitLineSegmentMoveHandler
     *
     * @param segmentId the id of the segment to split
     * @param transformationMatrix matrix applied to event coordinates
     * @param initialPoint the point to use when the mouse was only clicked but not dragged
     */
    constructor(
        private readonly segmentId: string,
        transformationMatrix: Matrix,
        initialPoint: Point
    ) {
        super(transformationMatrix, initialPoint);
    }

    override generateSplitSegmentEdits(x: number, y: number): Edit[] {
        const edit: SplitCanvasLineSegmentEdit = {
            types: [DefaultEditTypes.SPLIT_CANVAS_LINE_SEGMENT],
            values: { x, y },
            elements: [this.segmentId]
        };
        return [edit];
    }
}
