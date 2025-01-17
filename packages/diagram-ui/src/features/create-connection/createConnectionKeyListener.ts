import { injectable } from "inversify";
import { KeyListener, SModelElementImpl } from "sprotty";
import { Action } from "sprotty-protocol";
import { UpdateCreateConnectionDataAction } from "./updateCreateConnectionData.js";

/**
 * Key listener for updating the connection creation UI based on the shift key
 */
@injectable()
export class CreateConnectionKeyListener extends KeyListener {
    override keyDown(element: SModelElementImpl, event: KeyboardEvent): Action[] {
        if (event.key !== "Shift" || event.repeat) {
            return [];
        }
        const action: UpdateCreateConnectionDataAction = {
            kind: UpdateCreateConnectionDataAction.KIND,
            isVisible: true
        };
        return [action];
    }

    override keyUp(element: SModelElementImpl, event: KeyboardEvent): Action[] {
        if (event.key !== "Shift") {
            return [];
        }
        const action: UpdateCreateConnectionDataAction = {
            kind: UpdateCreateConnectionDataAction.KIND,
            isVisible: false
        };
        return [action];
    }
}
