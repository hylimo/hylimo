import { injectable } from "inversify";
import { KeyListener, SModelElementImpl } from "sprotty";
import { Action } from "sprotty-protocol";
import { UpdateLineProviderHoverDataAction } from "./updateLineProviderHoverData.js";

/**
 * Key listener for updating line provider hover data based on the shift key
 */
@injectable()
export class LineProviderHoverKeyListener extends KeyListener {
    override keyDown(element: SModelElementImpl, event: KeyboardEvent): Action[] {
        if (event.key !== "Shift" || event.repeat) {
            return [];
        }
        const action: UpdateLineProviderHoverDataAction = {
            kind: UpdateLineProviderHoverDataAction.KIND,
            isVisible: true
        };
        return [action];
    }

    override keyUp(element: SModelElementImpl, event: KeyboardEvent): Action[] {
        if (event.key !== "Shift") {
            return [];
        }
        const action: UpdateLineProviderHoverDataAction = {
            kind: UpdateLineProviderHoverDataAction.KIND,
            isVisible: false
        };
        return [action];
    }
}
