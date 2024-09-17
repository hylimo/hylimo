/**
 * Action to redo an action on a remote client
 */
export interface RemoteRedoAction {
    kind: typeof RemoteRedoAction.KIND;
}

export namespace RemoteRedoAction {
    /**
     * Kind of RemoteRedoAction
     */
    export const KIND = "remoteRedoAction";
    /**
     * Evaluates if the provided action is a RemoteRedoAction
     *
     * @param action the Action to check
     * @returns true if the action is a RemoteRedoAction
     */
    export function isRemoteRedoAction(action: any): action is RemoteRedoAction {
        return action.kind === KIND;
    }
}
