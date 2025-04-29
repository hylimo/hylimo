import type { SnapLine } from "./model.js";
import type { Action } from "sprotty-protocol";

/**
 * Action to update the snap lines
 */
export interface UpdateSnapLinesAction extends Action {
    kind: typeof UpdateSnapLinesAction.KIND;
    /**
     * The snap lines to display by their context
     */
    snapLines: Map<string, SnapLine[]>;
    /**
     * The id of the transaction
     */
    transactionId: string;
    /**
     * A monotonic increasing sequence number for the transaction
     */
    sequenceNumber: number;
}

export namespace UpdateSnapLinesAction {
    export const KIND = "updateSnapLines";

    /**
     * Checks if the action is an UpdateSnapLinesAction
     *
     * @param action the action to check
     * @returns true if it is an UpdateSnapLinesAction
     */
    export function is(action: Action): action is UpdateSnapLinesAction {
        return action.kind === KIND;
    }
}
