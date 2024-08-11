import { TransactionalAction } from "./transactionalAction.js";

/**
 * Action to edit the verticalPos of an axis aligned canvas connection segment
 */
export interface AxisAlignedSegmentEditAction extends TransactionalAction {
    kind: typeof AxisAlignedSegmentEditAction.KIND;
    /**
     * The id of the connection segment to edit
     */
    element: string;
    /**
     * The new vertical position of the segment
     */
    pos: number;
}

export namespace AxisAlignedSegmentEditAction {
    /**
     * Kind of AxisAlignedSegmentEditActions
     */
    export const KIND = "axisAlignedSegmentEditAction";

    /**
     * Checks if the action is an AxisAlignedSegmentEditAction
     *
     * @param action the action to check
     * @returns true if it is an AxisAlignedSegmentEditAction
     */
    export function is(action: TransactionalAction): action is AxisAlignedSegmentEditAction {
        return action.kind === KIND;
    }
}
