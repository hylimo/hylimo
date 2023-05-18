import { Action } from "sprotty-protocol";

/**
 * Handler which can handle element moves
 */
export interface MoveHandler {
    /**
     * Creates the action handling the move
     *
     * @param dx the absolute x offset
     * @param dy the absolute y offset
     * @param sequenceNumber the sequence number of the action
     * @param commited if true, this is the final action of the transaction
     * @param event the mouse event which triggered the move
     * @returns the generated action
     */
    generateAction(dx: number, dy: number, sequenceNumber: number, commited: boolean, event: MouseEvent): Action;
}
