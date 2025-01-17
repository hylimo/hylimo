import { Action } from "sprotty-protocol";
import { MoveHandler } from "./moveHandler.js";
import { SRoot } from "../../model/sRoot.js";

/**
 * Action to start a transactional move operation
 */
export interface TransactionalMoveAction extends Action {
    kind: typeof TransactionalMoveAction.KIND;
    /**
     * The provider for the create and move handler
     */
    handlerProvider: (root: SRoot) => MoveHandler;
    /**
     * The maximum number of updates that can be performed on the same revision.
     */
    maxUpdatesPerRevision: number;
}

export namespace TransactionalMoveAction {
    /**
     * Kind of action to start a transactional move operation
     */
    export const KIND = "transactionalMoveAction";

    /**
     * Evaluates if the provided action is a MoveAction
     *
     * @param action the Action to check
     * @returns true if the action is a MoveAction
     */
    export function isMoveAction(action: any): action is TransactionalMoveAction {
        return action.kind === KIND;
    }
}
