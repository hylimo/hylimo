import { TransactionalAction } from "./transactionalAction";

/**
 * Action to move a LinePoint to a new position on the line
 */
export interface LineMoveAction extends TransactionalAction {
    kind: typeof LineMoveAction.KIND;
    /**
     * The id of the LinePoint to move
     */
    point: string;
    /**
     * New pos of the LinePoint
     */
    pos: number;
}

export namespace LineMoveAction {
    /**
     * Kind of LineMoveActions
     */
    export const KIND = "lineMoveAction";

    /**
     * Checks if the action is a LineMoveAction
     *
     * @param action the action to check
     * @returns true if it is a LineMoveAction
     */
    export function is(action: TransactionalAction): action is LineMoveAction {
        return action.kind === KIND;
    }
}
