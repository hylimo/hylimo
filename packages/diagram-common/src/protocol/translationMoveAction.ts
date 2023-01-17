import { TransactionalAction } from "./transactionalAction";

/**
 * Translation move action to move absolute and relative points by an offset
 */
export interface TranslationMoveAction extends TransactionalAction {
    kind: typeof TranslationMoveAction.KIND;
    /**
     * Ids of absolute and relative points to translate
     */
    points: string[];
    /**
     * X part of the offset
     */
    offsetX: number;
    /**
     * Y part of the offset
     */
    offsetY: number;
    /**
     * X part of the offset, relative to the last action
     */
    deltaOffsetX: number;
    /**
     * Y part of the offset, relative to the last action
     */
    deltaOffsetY: number;
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
