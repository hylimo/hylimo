import {  Point, TransformedLine } from "@hylimo/diagram-common";
import { MoveHandler } from "./moveHandler.js";
import { Edit } from "@hylimo/diagram-protocol";

/**
 * Move handler for line point moves
 */
export class LineMoveHandler extends MoveHandler {
    /**
     * Creats a new LineMoveHandler
     *
     * @param point the id of the point to move
     * @param transactionId the id of the transaction
     * @param initialPosition the initial position of the point
     * @param onLine if true, the point should be moved on the line only, otherwise a relative point to the line is calculated
     * @param hasSegment if true, the segment index is defined
     * @param line the line on which the point is
     */
    constructor(
        readonly point: string,
        transactionId: string,
        readonly initialPosition: Point,
        readonly onLine: boolean,
        readonly hasSegment: boolean,
        readonly line: TransformedLine
    ) {
        super(transactionId);
    }

    /*
    generateAction(dx: number, dy: number, sequenceNumber: number, commited: boolean): LineMoveAction {
        const newPosition: Point = {
            x: this.initialPosition.x + dx,
            y: this.initialPosition.y + dy
        };
        const nearest = LineEngine.DEFAULT.projectPoint(newPosition, this.line);
        let posAndSegment;
        if (this.hasSegment) {
            posAndSegment = {
                pos: nearest.relativePos,
                segment: nearest.segment
            };
        } else {
            posAndSegment = {
                pos: nearest.pos
            };
        }
        return {
            kind: LineMoveAction.KIND,
            point: this.point,
            ...posAndSegment,
            distance: this.onLine ? undefined : nearest.distance,
            transactionId: this.transactionId,
            commited,
            sequenceNumber
        };
    }
        */

    protected override generateEdits(dx: number, dy: number, event: MouseEvent): Edit[] {
        throw new Error("Method not implemented.");
    }
}
