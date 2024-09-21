import { FitToScreenAction } from "sprotty-protocol";

/**
 * Creates a new action to fit the viewport to the current diagram with common params.
 */
export function createFitToScreenAction(): FitToScreenAction {
    return FitToScreenAction.create([], { padding: 50, maxZoom: 2 });
}
