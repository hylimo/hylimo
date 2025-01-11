import { AxisAlignedSegmentEdit, Edit } from "@hylimo/diagram-protocol";
import { DefaultEditTypes } from "@hylimo/diagram-common";
import { Matrix } from "transformation-matrix";
import { MoveHandler } from "../../move/moveHandler.js";

/**
 * Move handler for moving the vertical segment of an axis aligned connection segment.
 * Expects relative coordinates in the canvas connection parent canvas coordinate system.
 */
export class AxisAligedSegmentEditHandler extends MoveHandler {
    /**
     * Creates a new AxisAligedSegmentEditHandler
     *
     * @param element the id of the CanvasAxisAlignedConnectionSegment to move
     * @param original the original verticalPos/horizontalPos of the segment
     * @param start the x/y cooridnate of the start of the whole axis aligned segment
     * @param end the x/y cooridnate of the end of the whole axis aligned segment
     * @param vertical true if the vertical segment is moved, otherwise false
     * @param transformationMatrix transformation matrix to apply to obtain the relative position
     */
    constructor(
        readonly element: string,
        readonly original: number,
        readonly start: number,
        readonly end: number,
        readonly vertical: boolean,
        transformationMatrix: Matrix
    ) {
        super(transformationMatrix);
    }

    override generateEdits(x: number, y: number): Edit[] {
        const rawPos = (this.original + (this.vertical ? x : y) - this.start) / (this.end - this.start);
        const newPos = Math.min(1, Math.max(0, rawPos));
        return [
            {
                types: [DefaultEditTypes.AXIS_ALIGNED_SEGMENT_POS],
                values: {
                    pos: this.vertical ? newPos : newPos - 1
                },
                elements: [this.element]
            } satisfies AxisAlignedSegmentEdit
        ];
    }
}
