import type { Action } from "sprotty-protocol";

/**
 * Action to reset the bounds of the root
 */
export interface ResetCanvasBoundsAction extends Action {
    kind: typeof ResetCanvasBoundsAction.KIND;
}

export namespace ResetCanvasBoundsAction {
    /**
     * Kind of action which resets the canvas bounds
     */
    export const KIND = "resetCanvasBoundsAction";
}
