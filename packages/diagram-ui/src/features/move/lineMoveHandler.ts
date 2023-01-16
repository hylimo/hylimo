import { Action } from "sprotty-protocol";
import { MoveHandler } from "./moveHandler";

/**
 * Move handler for line point moves
 */
export class LineMoveHandler implements MoveHandler {
    /**
     * Creats a new LineMoveHandler
     *
     * @param point the id of the point to move
     * @param transactionId the id of the transaction
     */
    constructor(readonly point: string, readonly transactionId: string) {}

    generateAction(dx: number, dy: number, commited: boolean): Action {
        throw new Error("Method not implemented.");
    }
}
