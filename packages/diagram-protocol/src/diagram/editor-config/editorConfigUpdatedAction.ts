import type { Action } from "sprotty-protocol";
import type { EditorConfig } from "./editorConfig.js";

/**
 * Action to update the editor configuration from the server
 */
export interface EditorConfigUpdatedAction extends Action {
    kind: typeof EditorConfigUpdatedAction.KIND;
    /**
     * The new editor configuration
     */
    config: EditorConfig;
}

export namespace EditorConfigUpdatedAction {
    /**
     * Kind of EditorConfigUpdatedActions
     */
    export const KIND = "EditorConfigUpdatedAction";

    /**
     * Checks if the action is a EditorConfigUpdatedAction
     *
     * @param action the action to check
     * @returns true if it is a EditorConfigUpdatedAction
     */
    export function is(action: Action): action is EditorConfigUpdatedAction {
        return action.kind === KIND;
    }
}
