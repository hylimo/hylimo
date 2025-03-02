import type { Root } from "@hylimo/diagram-common";
import type { ResponseAction } from "sprotty-protocol";

/**
 * Response for the ToolboxEditPredictionRequestAction
 * Provides a root element which contains the prediction for the toolbox edit
 */
export interface ToolboxEditPredictionResponseAction extends ResponseAction {
    kind: typeof ToolboxEditPredictionResponseAction.KIND;
    /**
     * The graphical prediction for the toolbox edit
     * Undefined if the prediction is not possible
     */
    root: Root | undefined;
}

export namespace ToolboxEditPredictionResponseAction {
    /**
     * Kind of ToolboxEditPredictionResponseActions
     */
    export const KIND = "toolboxEditPredictionResponseAction";

    /**
     * Checks if the action is a ToolboxEditPredictionResponseAction
     *
     * @param action the action to check
     * @returns true if it is a ToolboxEditPredictionResponseAction
     */
    export function is(action: ResponseAction): action is ToolboxEditPredictionResponseAction {
        return action.kind === KIND;
    }
}
