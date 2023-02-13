import { TranslationMoveAction } from "@hylimo/diagram-common";
import { MoveHandler } from "../moveHandler";

/**
 * Move handler for translations of absolute and relative points
 */
export class TranslationMoveHandler implements MoveHandler {
    /**
     * last x offset
     */
    private lastDx = 0;
    /**
     * last y offset
     */
    private lastDy = 0;

    /**
     * Creats a new TranslateMovehandler
     *
     * @param points the ids of the points to move
     * @param transactionId the id of the transaction
     */
    constructor(readonly points: string[], readonly transactionId: string) {}

    generateAction(dx: number, dy: number, commited: boolean): TranslationMoveAction {
        const res: TranslationMoveAction = {
            kind: TranslationMoveAction.KIND,
            transactionId: this.transactionId,
            elements: this.points,
            offsetX: dx,
            offsetY: dy,
            deltaOffsetX: dx - this.lastDx,
            deltaOffsetY: dy - this.lastDy,
            commited
        };
        this.lastDx = dx;
        this.lastDy = dy;
        return res;
    }
}
