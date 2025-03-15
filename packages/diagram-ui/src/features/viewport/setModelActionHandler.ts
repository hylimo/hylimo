import { injectable } from "inversify";
import type { IActionHandler, ICommand } from "sprotty";
import type { Action } from "sprotty-protocol";
import { createFitToScreenAction } from "./fitToScreenAction.js";

/**
 * Action handler that executes fit-to-screen whenever the model has been set (initial page load)
 */
@injectable()
export class SetModelActionHandler implements IActionHandler {
    handle(_: Action): ICommand | Action | void {
        return createFitToScreenAction(false);
    }
}
