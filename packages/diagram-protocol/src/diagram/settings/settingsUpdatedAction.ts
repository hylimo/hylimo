import type { Action } from "sprotty-protocol";
import type { SharedSettings } from "../../lsp/settings.js";

/**
 * Action to update the settings from the server
 */
export interface SettingsUpdatedAction extends Action {
    kind: typeof SettingsUpdatedAction.KIND;
    /**
     * The new settings
     */
    settings: SharedSettings;
}

export namespace SettingsUpdatedAction {
    /**
     * Kind of SettingsUpdatedActions
     */
    export const KIND = "SettingsUpdatedAction";

    /**
     * Checks if the action is a SettingsUpdatedAction
     *
     * @param action the action to check
     * @returns true if it is a SettingsUpdatedAction
     */
    export function is(action: Action): action is SettingsUpdatedAction {
        return action.kind === KIND;
    }
}
