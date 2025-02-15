import { Action } from "sprotty-protocol";
import { CanvasLike } from "../../model/canvas/canvasLike.js";
import { injectable, inject } from "inversify";
import { TYPES } from "../types.js";
import { Command, CommandExecutionContext, CommandReturn } from "sprotty";

/**
 * Different types of resize cursers which can be fixed during a move transaction
 */
export type ResizeMoveCursor = `cursor-resize-${number}`;

/**
 * Different types of cursers which can be fixed during a move transaction
 */
export type MoveCursor = `cursor-${"move" | "grab"}` | ResizeMoveCursor;

/**
 * Computes the offset to the index of a resize icon based on the elements rotation relative to the diagram root.
 * The resize icon index ranges from 0 to 7, where each step is a 45 degree rotation.
 * The computed offset can be applied to the index based on the location of the resize border, e.g. 0 for the top left corner,
 * to obtain the index of the icon which is rotated according to the element's rotation relative to the diagram root.
 *
 * @param canvas the canvas which forms the context
 * @param additionalRotation the additional rotation (e.g. for the canvas element) in degrees
 * @returns the offset for the rotation of the canvas element
 */
export function computeResizeIconOffset(canvas: Readonly<CanvasLike>, additionalRotation: number): number {
    const canvasRotation = canvas.globalRotation;
    const iconOffset = Math.round(((additionalRotation + canvasRotation) / 45) % 8);
    return iconOffset;
}

/**
 * Finds the resize icon class in a class list
 *
 * @param classList the class list to search in
 * @returns the resize icon class or undefined
 */
export function findResizeIconClass(classList: DOMTokenList): ResizeMoveCursor | undefined {
    for (let i = 0; i < classList.length; i++) {
        const item = classList.item(i);
        if (item?.startsWith("cursor-resize-")) {
            return item as ResizeMoveCursor;
        }
    }
    return undefined;
}

/**
 * Provider for the current move cursor
 */
@injectable()
export class MoveCursorProvider {
    moveCursor?: MoveCursor;
}

/**
 * Action to update the move cursor
 */
export interface SetMoveCursorAction extends Action {
    kind: typeof SetMoveCursorAction.KIND;
    /**
     * The new move cursor
     */
    cursor?: MoveCursor;
}

export namespace SetMoveCursorAction {
    /**
     * Kind of SetMoveCursorAction
     */
    export const KIND = "setMoveCursor";
}

/**
 * Command for SetMoveCursorAction
 */
@injectable()
export class SetMoveCursorCommand extends Command {
    static readonly KIND = SetMoveCursorAction.KIND;

    /**
     * The action to execute
     */
    @inject(TYPES.Action) private action!: SetMoveCursorAction;

    /**
     * The move cursor provider
     */
    @inject(TYPES.MoveCursorProvider) private moveCursorProvider!: MoveCursorProvider;

    override execute(context: CommandExecutionContext): CommandReturn {
        this.moveCursorProvider.moveCursor = this.action.cursor;
        return context.root;
    }

    override undo(_context: CommandExecutionContext): CommandReturn {
        throw new Error("Undo is not supported");
    }

    override redo(_context: CommandExecutionContext): CommandReturn {
        throw new Error("Redo is not supported");
    }
}
