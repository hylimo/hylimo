import { injectable } from "inversify";
import { IActionHandler, ICommand } from "sprotty";
import { Action, FitToScreenAction } from "sprotty-protocol";

/**
 * Action handler that executes fit-to-screen whenever the model has been set (initial page load)
 */
@injectable()
export class SetModelActionHandler implements IActionHandler {
    handle(_: Action): ICommand | Action | void {
        return FitToScreenAction.create([]);
    }
}
