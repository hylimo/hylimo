import { Action, RequestAction } from "sprotty-protocol";
import { ToolboxEditPredictionResponseAction } from "./toolboxEditPredictionResponseAction.js";
import { ConnectionEdit, ToolboxEdit } from "../transaction/defaultEditTypes.js";

/**
 * Action to request a prediction for a toolbox or connection edit
 */
export interface ToolboxEditPredictionRequestAction extends RequestAction<ToolboxEditPredictionResponseAction> {
    kind: typeof ToolboxEditPredictionRequestAction.KIND;
    /**
     * The edit to generate the prediction for
     */
    edit: ToolboxEdit | ConnectionEdit;
}

export namespace ToolboxEditPredictionRequestAction {
    /**
     * Kind of ToolboxEditPredictionRequestActions
     */
    export const KIND = "toolboxEditPredictionRequestAction";

    /**
     * Checks if the action is a ToolboxEditPredictionRequestAction
     *
     * @param action the action to check
     * @returns true if it is a ToolboxEditPredictionRequestAction
     */
    export function is(action: Action): action is ToolboxEditPredictionRequestAction {
        return action.kind === KIND;
    }
}
