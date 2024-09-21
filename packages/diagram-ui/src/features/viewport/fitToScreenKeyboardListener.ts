import { isCtrlOrCmd, KeyListener, SModelElementImpl } from "sprotty";
import { Action, CenterAction} from "sprotty-protocol";
import { injectable } from "inversify";
import { createFitToScreenAction } from "./fitToScreenAction.js";

/**
 * Copy of the sprotty built-in key listener for ctrl+shift+c/f, except we can now set custom options
 */
@injectable()
export class CenterKeyboardListener extends KeyListener {
    override keyDown(element: SModelElementImpl, event: KeyboardEvent): Action[] {
        if (!isCtrlOrCmd(event) || !event.shiftKey) {
            return [];
        }
        if (event.key.toLowerCase() == "c") {
            return [CenterAction.create([], { retainZoom: true })];
        }
        if (event.key.toLowerCase() == "f") {
            return [createFitToScreenAction()];
        }
        return [];
    }
}
