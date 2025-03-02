import type { Action } from "sprotty-protocol";
import { injectable, inject } from "inversify";
import { TYPES } from "../types.js";
import type { CommandExecutionContext, CommandReturn } from "sprotty";
import { Command } from "sprotty";

/**
 * Different types of resize cursers which can be fixed during a move transaction
 */
export type ResizeMoveCursor = `cursor-resize-${number}`;

/**
 * Different types of cursers which can be fixed during a move transaction
 */
export type Cursor = `cursor-${"move" | "grab" | "grabbing" | "crosshair"}` | ResizeMoveCursor;

/**
 * Provider for the current move cursor
 */
@injectable()
export class CursorProvider {
    /**
     * The cursor which should be displayed due to the currently selected tool.
     * If undefined, no specific cursor should be enforced on the root level
     */
    toolCursor?: Cursor;
    /**
     * The cursor which should be displayed due to the current move operation.
     * Overwrites the tool cursor if set.
     */
    moveCursor?: Cursor;
}

/**
 * Action to update the move/tool cursor
 */
export interface UpdateCursorAction extends Action {
    kind: typeof UpdateCursorAction.KIND;
    /**
     * The new tool cursor
     * If null, the tool cursor is unset
     */
    toolCursor?: Cursor | null;
    /**
     * The new move cursor
     * If null, the move cursor is unset
     */
    moveCursor?: Cursor | null;
}

export namespace UpdateCursorAction {
    /**
     * Kind of UpdateCursorAction
     */
    export const KIND = "updateCursor";
}

/**
 * Command for UpdateCursorAction
 */
@injectable()
export class UpdateCursorCommand extends Command {
    static readonly KIND = UpdateCursorAction.KIND;

    /**
     * The action to execute
     */
    @inject(TYPES.Action) private action!: UpdateCursorAction;

    /**
     * The move cursor provider
     */
    @inject(TYPES.MoveCursorProvider) private moveCursorProvider!: CursorProvider;

    override execute(context: CommandExecutionContext): CommandReturn {
        if (this.action.toolCursor === null) {
            this.moveCursorProvider.toolCursor = undefined;
        } else if (this.action.toolCursor != undefined) {
            this.moveCursorProvider.toolCursor = this.action.toolCursor;
        }
        if (this.action.moveCursor === null) {
            this.moveCursorProvider.moveCursor = undefined;
        } else if (this.action.moveCursor != undefined) {
            this.moveCursorProvider.moveCursor = this.action.moveCursor;
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
