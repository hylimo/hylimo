import { Action } from "sprotty-protocol";
import { CreateMoveHandler } from "./createMoveHandler.js";
import { SRoot } from "../../model/sRoot.js";

/**
 * Action to create and move a diagram element
 */
export interface CreateAndMoveAction extends Action {
    kind: typeof CreateAndMoveAction.KIND;
    /**
     * The provider for the create and move handler
     */
    handlerProvider: (root: SRoot) => CreateMoveHandler;
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
