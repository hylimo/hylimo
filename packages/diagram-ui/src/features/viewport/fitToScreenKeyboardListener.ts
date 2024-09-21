import { KeyListener, SModelElementImpl } from "sprotty";
import { Action, CenterAction, FitToScreenAction } from "sprotty-protocol";
import { matchesKeystroke } from "sprotty/lib/utils/keyboard.js";
import { injectable } from "inversify";

/**
 * Copy of the sprotty built-in key listener for ctrl+shift+c/f, except we can now set custom options
 */
@injectable()
export class CenterKeyboardListener extends KeyListener {
    override keyDown(element: SModelElementImpl, event: KeyboardEvent): Action[] {
        if (matchesKeystroke(event, "KeyC", "ctrlCmd", "shift")) return [CenterAction.create([], { retainZoom: true })];
        if (matchesKeystroke(event, "KeyF", "ctrlCmd", "shift")) return [FitToScreenAction.create([], { padding: 50 })];
        return [];
    }
}
