/**
 * Transactional action with a transaction id
 */
export interface TransactionalAction {
    /**
     * The kind of the action
     */
    kind: string;
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
    commited: boolean;
}

export namespace TransactionalAction {
    /**
     * Evaluates if the provided action is a TransactionalAction
     *
     * @param action the Action to check
     * @returns true if the action is a TransactionalAction
     */
    export function isTransactionalAction(action: any): action is TransactionalAction {
        return "transactionId" in action && "commited" in action;
    }
}
