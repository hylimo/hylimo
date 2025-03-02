import type { Action } from "sprotty-protocol";

/**
 * Action to navigate to the source of an element
 */
export interface NavigateToSourceAction extends Action {
    kind: typeof NavigateToSourceAction.KIND;
    /**
     * The id of the element to navigate to
     */
    element: string;
}

export namespace NavigateToSourceAction {
    /**
     * Kind of NavigateToSourceActions
     */
    export const KIND = "navigateToSourceAction";

    /**
     * Checks if the action is a NavigateToSourceAction
     *
     * @param action the action to check
     * @returns true if it is a NavigateToSourceAction
     */
    export function is(action: Action): action is NavigateToSourceAction {
        return action.kind === KIND;
    }
}
