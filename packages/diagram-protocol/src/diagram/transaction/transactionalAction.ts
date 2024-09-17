import { Edit } from "./edit.js";

/**
 * Transactional action with a transaction id
 */
export interface TransactionalAction {
    /**
     * The kind of the action
     */
    kind: typeof TransactionalAction.KIND;
    /**
     * The id of the transaction
     */
    transactionId: string;
    /**
     * A monotonic increasing sequence number for the transaction
     */
    sequenceNumber: number;
    /**
     * If true, the action commits the transaction
     * and no further actions with the same transactionId are possible.
     */
    committed: boolean;
    /**
     * The edits to perform
     */
    edits: Edit[];
}

export namespace TransactionalAction {
    /**
     * Kind of TransactionalActions
     */
    export const KIND = "transactionalAction";

    /**
     * Evaluates if the provided action is a TransactionalAction
     *
     * @param action the Action to check
     * @returns true if the action is a TransactionalAction
     */
    export function isTransactionalAction(action: any): action is TransactionalAction {
        return action.kind === KIND;
    }
}
