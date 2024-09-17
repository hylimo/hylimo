/**
 * Action to undo an action on a remote client
 */
export interface RemoteUndoAction {
    kind: typeof RemoteUndoAction.KIND;
}

export namespace RemoteUndoAction {
    /**
     * Kind of RemoteUndoAction
     */
    export const KIND = "RemoteUndoAction";
    /**
     * Evaluates if the provided action is a RemoteUndoAction
     *
     * @param action the Action to check
     * @returns true if the action is a RemoteUndoAction
     */
    export function isRemoteUndoAction(action: any): action is RemoteUndoAction {
        return action.kind === KIND;
    }
}
