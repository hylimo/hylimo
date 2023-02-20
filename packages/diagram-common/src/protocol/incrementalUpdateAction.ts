/**
 * Action to update model elements incrementally
 */
export interface IncrementalUpdateAction {
    kind: typeof IncrementalUpdateAction.KIND;
    /**
     * Updates to apply
     */
    updates: IncrementalUpdate[];
}

/**
 * An incremental update to a model element
 */
export interface IncrementalUpdate {
    /**
     * The id of the element to update
     */
    target: string;
    /**
     * Fields and new values to update
     */
    changes: Record<string, any>;
}

export namespace IncrementalUpdateAction {
    export const KIND = "incrementalUpdateAction";

    /**
     * Checks if an action is an IncrementalUpdateAction
     *
     * @param action the action to check
     * @returns true if it is an IncrementalUpdateAction
     */
    export function is(action: { kind: string }): action is IncrementalUpdateAction {
        return action.kind === KIND;
    }
}
