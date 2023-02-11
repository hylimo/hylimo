import { TransactionalAction } from "./transactionalAction";

/**
 * Action to rotate a CanvasElement to a new rotation
 */
export interface RotationAction extends TransactionalAction {
    kind: typeof RotationAction.KIND;
    /**
     * The id of the element to move
     */
    element: string;
    /**
     * New rotation of the CanvasElement
     */
    rotation: number;
}

export namespace RotationAction {
    /**
     * Kind of RotationActions
     */
    export const KIND = "rotationAction";

    /**
     * Checks if the action is a RotationAction
     *
     * @param action the action to check
     * @returns true if it is a RotationAction
     */
    export function is(action: TransactionalAction): action is RotationAction {
        return action.kind === KIND;
    }
}
