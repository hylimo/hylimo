import { TranslationMoveAction } from "@hylimo/diagram-protocol";
import { MoveHandler } from "./moveHandler.js";

/**
 * Move handler for translations of absolute and relative points
 */
export class TranslationMoveHandler implements MoveHandler {
    /**
     * Creats a new TranslateMovehandler
     *
     * @param points the ids of the points to move
     * @param transactionId the id of the transaction
     */
    constructor(
        readonly points: string[],
        readonly transactionId: string
    ) {}

    generateAction(
        dx: number,
        dy: number,
        sequenceNumber: number,
        commited: boolean,
        event: MouseEvent
    ): TranslationMoveAction {
        let offsetX = dx;
        let offsetY = dy;
        if (event.shiftKey) {
            if (Math.abs(dx) > Math.abs(dy)) {
                offsetY = 0;
            } else {
                offsetX = 0;
            }
        }
        return {
            kind: TranslationMoveAction.KIND,
            transactionId: this.transactionId,
            elements: this.points,
            offsetX,
            offsetY,
            commited,
            sequenceNumber
        };
    }
}
