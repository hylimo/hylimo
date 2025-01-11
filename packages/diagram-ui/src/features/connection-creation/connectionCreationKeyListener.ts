import { KeyListener, SModelElementImpl } from "sprotty";
import { Action } from "sprotty-protocol";
import { UpdateConnectionPreviewAction } from "./updateConnectionPreview.js";

/**
 * Key listener for updating the connection creation preview based on the shift key
 */
export class ConnectionCreationKeyListener extends KeyListener {
    override keyDown(element: SModelElementImpl, event: KeyboardEvent): Action[] {
        if (event.key !== "Shift") {
            return [];
        }
        const action: UpdateConnectionPreviewAction = {
            kind: UpdateConnectionPreviewAction.KIND,
            isVisible: true
        };
        return [action];
    }

    override keyUp(element: SModelElementImpl, event: KeyboardEvent): Action[] {
        if (event.key !== "Shift") {
            return [];
        }
        const action: UpdateConnectionPreviewAction = {
            kind: UpdateConnectionPreviewAction.KIND,
            isVisible: false
        };
        return [action];
    }
}
