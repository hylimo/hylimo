import { KeyListener, SModelElementImpl } from "sprotty";
import { injectable } from "inversify";
import { Action } from "sprotty-protocol";
import { UpdateKeyStateAction } from "./updateKeyState.js";

/**
 * Key listener for the key state feature
 */
@injectable()
export class KeyStateKeyListener extends KeyListener {
    override keyDown(element: SModelElementImpl, event: KeyboardEvent): Action[] {
        return generateUpdateKeyStateActions(event, true);
    }

    override keyUp(element: SModelElementImpl, event: KeyboardEvent): Action[] {
        return generateUpdateKeyStateActions(event, false);
    }
}

/**
 * Generates key state update actions for key down events.
 *
 * @param event The key down event
 * @param pressed Whether the key is pressed
 * @returns The generated actions
 */
export function generateUpdateKeyStateActions(event: KeyboardEvent, pressed: boolean): UpdateKeyStateAction[] {
    const actions: UpdateKeyStateAction[] = [];
    if (event.repeat) {
        return actions;
    }
    if (event.key === "Shift") {
        actions.push({ kind: UpdateKeyStateAction.KIND, isShiftPressed: pressed });
    } else if (event.key === " ") {
        actions.push({ kind: UpdateKeyStateAction.KIND, isSpacePressed: pressed });
    }
    return actions;
}
