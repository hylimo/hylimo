import { Edit, TransactionalAction } from "@hylimo/diagram-protocol";

/**
 * Handler which can handle element moves
 */
export abstract class MoveHandler {
    /**
     * Creats a new MoveHandler
     *
     * @param transactionId the id of the transaction
     */
    constructor(readonly transactionId: string) {}

    /**
     * Creates the action handling the move
     *
     * @param dx the absolute x offset
     * @param dy the absolute y offset
     * @param sequenceNumber the sequence number of the action
     * @param committed if true, this is the final action of the transaction
     * @param event the mouse event which triggered the move
     * @returns the generated action
     */
    generateAction(
        dx: number,
        dy: number,
        sequenceNumber: number,
        committed: boolean,
        event: MouseEvent
    ): TransactionalAction {
        return {
            kind: TransactionalAction.KIND,
            transactionId: this.transactionId,
            sequenceNumber,
            committed,
            edits: this.generateEdits(dx, dy, event)
        };
    }

    /**
     * Generates the edits for the move
     * @param dx the absolute x offset
     * @param dy the absolute y offset
     * @param event the mouse event which triggered the move
     */
    protected abstract generateEdits(dx: number, dy: number, event: MouseEvent): Edit[];
}
