import { FitToScreenAction } from "sprotty-protocol";

export function createFitToScreenAction(): FitToScreenAction {
    return FitToScreenAction.create([], { padding: 50, maxZoom: 2 });
}
