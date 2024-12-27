import { Action } from "sprotty-protocol";

/**
 * Action to create and move a diagram element
 */
export interface CreateAndMoveAction extends Action {
    kind: typeof CreateAndMoveAction.KIND;
    /**
     * The edit to perform
     */
    edit: string;
    /**
     * If true, if available, a target is used instead of coordinates
     */
    targetMode: boolean;
    /**
     * The mouse event which started the action
     */
    event: MouseEvent;
}

export namespace CreateAndMoveAction {
    /**
     * Kind of action which starts a create and move transaction
     */
    export const KIND = "createAndMoveAction";

    /**
     * Evaluates if the provided action is a CreateAndMoveAction
     *
     * @param action the Action to check
     * @returns true if the action is a CreateAndMoveAction
     */
    export function isCreateAndMoveAction(action: any): action is CreateAndMoveAction {
        return action.kind === KIND;
    }
}
