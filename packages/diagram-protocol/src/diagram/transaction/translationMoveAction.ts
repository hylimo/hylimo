import { TransactionalAction } from "./transactionalAction.js";

/**
 * Translation move action to move absolute and relative points by an offset
 */
export interface TranslationMoveAction extends TransactionalAction {
    kind: typeof TranslationMoveAction.KIND;
    /**
     * Ids of absolute and relative points and canvas elements to translate
     */
    elements: string[];
    /**
     * X part of the offset
     */
    offsetX: number;
    /**
     * Y part of the offset
     */
    offsetY: number;
}

export namespace TranslationMoveAction {
    /**
     * Kind of TranslationMoveActions
     */
    export const KIND = "translationMoveAction";

    /**
     * Checks if the action is a TranslationMoveAction
     *
     * @param action the action to check
     * @returns true if it is a TranslationMoveAction
     */
    export function is(action: TransactionalAction): action is TranslationMoveAction {
        return action.kind === KIND;
    }
}
