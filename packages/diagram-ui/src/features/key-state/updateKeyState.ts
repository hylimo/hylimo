import type { CommandExecutionContext, CommandReturn } from "sprotty";
import { Command } from "sprotty";
import type { Action } from "sprotty-protocol";
import { inject, injectable } from "inversify";
import { TYPES } from "../types.js";
import type { KeyState } from "./keyState.js";

/**
 * Action to update the key state
 */
export interface UpdateKeyStateAction extends Action {
    /**
     * Whether the shift key is pressed
     */
    isShiftPressed?: boolean;
    /**
     * Whether the space key is pressed
     */
    isSpacePressed?: boolean;
}

export namespace UpdateKeyStateAction {
    export const KIND = "updateKeyState";
}

/**
 * Command for UpdateKeyStateAction
 */
@injectable()
export class UpdateKeyStateCommand extends Command {
    static readonly KIND = UpdateKeyStateAction.KIND;

    /**
     * The action to execute
     */
    @inject(TYPES.Action) private action!: UpdateKeyStateAction;

    /**
     * The key state to update
     */
    @inject(TYPES.KeyState) protected readonly keyState!: KeyState;

    override execute(context: CommandExecutionContext): CommandReturn {
        if (this.action.isShiftPressed != undefined) {
            this.keyState.isShiftPressed = this.action.isShiftPressed;
        }
        if (this.action.isSpacePressed != undefined) {
            this.keyState.isSpacePressed = this.action.isSpacePressed;
        }
        return context.root;
    }

    override undo(_context: CommandExecutionContext): CommandReturn {
        throw new Error("Undo is not supported");
    }

    override redo(_context: CommandExecutionContext): CommandReturn {
        throw new Error("Redo is not supported");
    }
}
