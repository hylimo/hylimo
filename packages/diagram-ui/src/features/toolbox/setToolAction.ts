import type { Action } from "sprotty-protocol";
import type { ToolboxToolType } from "./toolType.js";

/**
 * Action to set the toolbox tool.
 */
export interface SetToolAction extends Action {
    kind: typeof SetToolAction.KIND;
    /**
     * The ID of the tool to set.
     */
    tool: ToolboxToolType;
}

export namespace SetToolAction {
    /**
     * The type of the SetToolAction.
     */
    export const KIND = "setTool";

    /**
     * Checks if the given action is a SetToolAction.
     *
     * @param action The action to check.
     * @returns true if the action is a SetToolAction, false otherwise.
     */
    export function is(action: Action): action is SetToolAction {
        return action.kind === KIND;
    }
}
