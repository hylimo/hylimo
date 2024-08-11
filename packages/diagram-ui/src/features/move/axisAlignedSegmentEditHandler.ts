import { AxisAlignedSegmentEditAction } from "@hylimo/diagram-protocol";
import { MoveHandler } from "./moveHandler.js";

/**
 * Move handler for moving the vertical segment of an axis aligned connection segment
 */
export class AxisAligedSegmentEditHandler implements MoveHandler {
    /**
     * Creates a new AxisAligedSegmentEditHandler
     *
     * @param element the id of the CanvasAxisAlignedConnectionSegment to move
     * @param transactionId the id of the transaction
     * @param original the original verticalPos/horizontalPos of the segment
     * @param start the x/y cooridnate of the start of the whole axis aligned segment
     * @param end the x/y cooridnate of the end of the whole axis aligned segment
     * @param vertical true if the vertical segment is moved, otherwise false
     */
    constructor(
        readonly element: string,
        readonly transactionId: string,
        readonly original: number,
        readonly start: number,
        readonly end: number,
        readonly vertical: boolean
    ) {}

    generateAction(dx: number, dy: number, sequenceNumber: number, commited: boolean): AxisAlignedSegmentEditAction {
        const rawPos = (this.original + (this.vertical ? dx : dy) - this.start) / (this.end - this.start);
        const newPos = Math.min(1, Math.max(0, rawPos));
        return {
            kind: AxisAlignedSegmentEditAction.KIND,
            element: this.element,
            transactionId: this.transactionId,
            commited,
            pos: this.vertical ? newPos : newPos - 1,
            sequenceNumber
        };
    }
}
