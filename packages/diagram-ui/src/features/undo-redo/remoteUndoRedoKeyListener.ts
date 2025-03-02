import { injectable } from "inversify";
import { RemoteRedoAction, RemoteUndoAction } from "@hylimo/diagram-protocol";
import type { SModelElementImpl } from "sprotty";
import { isCtrlOrCmd, KeyListener } from "sprotty";
import type { Action } from "sprotty-protocol";

/**
 * Key listener for remote undo and redo actions
 */
@injectable()
export class RemoteUndoRedoKeyListener extends KeyListener {
    override keyDown(element: SModelElementImpl, event: KeyboardEvent): Action[] {
        if (!isCtrlOrCmd(event)) {
            return [];
        }
        if (event.key.toLowerCase() == "y" || (event.shiftKey && event.key.toLowerCase() == "z")) {
            return [{ kind: RemoteRedoAction.KIND } satisfies RemoteRedoAction];
        }
        if (event.key.toLowerCase() == "z") {
            return [{ kind: RemoteUndoAction.KIND } satisfies RemoteUndoAction];
        }
        return [];
    }
}
