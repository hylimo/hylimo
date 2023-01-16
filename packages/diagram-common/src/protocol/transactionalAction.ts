import { Action } from "sprotty-protocol";

/**
 * Transactional action with a transaction id
 */
export interface TransactionalAction extends Action {
    /**
     * The id of the transaction
     */
    transactionId: string;
    /**
     * If true, the action commits the transaction
     * and no further actions with the same transactionId are possible.
     */
    commited: boolean;
}

export namespace TransactionalAction {
    /**
     * Evaluates if the provided action is a TransactionalAction
     *
     * @param action the Action to check
     * @returns true if the action is a TransactionalAction
     */
    export function isTransactionalAction(action: Action): action is TransactionalAction {
        return "transactionId" in action && "commited" in action;
    }
}
