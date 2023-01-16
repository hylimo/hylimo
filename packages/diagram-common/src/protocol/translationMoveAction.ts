import { TransactionalAction } from "./transactionalAction";

/**
 * Translation move action to move absolute and relative points by an offset
 * The provided offset is relative to the last action
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
}

export namespace TranslationMoveAction {
    /**
     * Kind of TranslationMoveActions
     */
    export const KIND = "TranslationMoveAction";
}
