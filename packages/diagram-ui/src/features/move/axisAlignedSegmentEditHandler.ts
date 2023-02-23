import { AxisAlignedSegmentEditAction } from "@hylimo/diagram-common";
import { MoveHandler } from "./moveHandler";

/**
 * Move handler for moving the vertical segment of an axis aligned connection segment
 */
export class AxisAligedSegmentEditHandler implements MoveHandler {
    /**
     * Creates a new AxisAligedSegmentEditHandler
     *
     * @param element the id of the CanvasAxisAlignedConnectionSegment to move
     * @param transactionId the id of the transaction
     * @param originalX the original verticalPos of the segment
     * @param startX the x cooridnate of the start of the whole axis aligned segment
     * @param endX the x cooridnate of the end of the whole axis aligned segment
     */
    constructor(
        readonly element: string,
        readonly transactionId: string,
        readonly originalX: number,
        readonly startX: number,
        readonly endX: number
    ) {}

    generateAction(dx: number, dy: number, sequenceNumber: number, commited: boolean): AxisAlignedSegmentEditAction {
        const rawPos = (this.originalX + dx - this.startX) / (this.endX - this.startX);
        const newPos = Math.min(1, Math.max(0, rawPos));
        return {
            kind: AxisAlignedSegmentEditAction.KIND,
            element: this.element,
            transactionId: this.transactionId,
            commited,
            verticalPos: newPos,
            sequenceNumber
        };
    }
}
