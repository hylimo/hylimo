import { FitToScreenAction } from "sprotty-protocol";

/**
 * Creates a new action to fit the viewport to the current diagram with common params.
 *
 * @param animate whether to animate the action
 */
export function createFitToScreenAction(animate: boolean | undefined = undefined): FitToScreenAction {
    return FitToScreenAction.create([], { padding: 50, maxZoom: 2, animate });
}
