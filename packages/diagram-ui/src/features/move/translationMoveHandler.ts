import { TranslationMoveAction } from "@hylimo/diagram-protocol";
import { MoveHandler } from "./moveHandler";

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
    constructor(readonly points: string[], readonly transactionId: string) {}

    generateAction(dx: number, dy: number, sequenceNumber: number, commited: boolean): TranslationMoveAction {
        return {
            kind: TranslationMoveAction.KIND,
            transactionId: this.transactionId,
            elements: this.points,
            offsetX: dx,
            offsetY: dy,
            commited,
            sequenceNumber
        };
    }
}
