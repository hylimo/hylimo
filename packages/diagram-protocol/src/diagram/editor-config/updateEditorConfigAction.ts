import type { Action } from "sprotty-protocol";
import type { EditorConfig } from "./editorConfig.js";

/**
 * Action to update the editor configuration from the client
 */
export interface UpdateEditorConfigAction extends Action {
    kind: typeof UpdateEditorConfigAction.KIND;
    /**
     * The new editor configuration
     */
    config: EditorConfig;
}

export namespace UpdateEditorConfigAction {
    /**
     * Kind of UpdateEditorConfigActions
     */
    export const KIND = "updateEditorConfigAction";

    /**
     * Checks if the action is a UpdateEditorConfigAction
     *
     * @param action the action to check
     * @returns true if it is a UpdateEditorConfigAction
     */
    export function is(action: Action): action is UpdateEditorConfigAction {
        return action.kind === KIND;
    }
}
