import { TransactionalAction } from "./transactionalAction.js";

/**
 * Resize action to resize canvas elements by a factor
 */
export interface ResizeAction extends TransactionalAction {
    kind: typeof ResizeAction.KIND;
    /**
     * Ids of canvas elements to resize
     */
    elements: string[];
    /**
     * x resize factor, if undefined, the element is not resized in x direction
     */
    factorX?: number;
    /**
     * y resize factor, if undefined, the element is not resized in y direction
     */
    factorY?: number;
}

export namespace ResizeAction {
    /**
     * Kind of ResizeActions
     */
    export const KIND = "resizeAction";

    /**
     * Checks if the action is a ResizeAction
     *
     * @param action the action to check
     * @returns true if it is a ResizeAction
     */
    export function is(action: TransactionalAction): action is ResizeAction {
        return action.kind === KIND;
    }
}
