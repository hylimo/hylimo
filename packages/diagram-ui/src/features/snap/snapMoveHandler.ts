import { MoveHandler } from "../move/moveHandler.js";
import type { SnapHandler } from "./snapHandler.js";
import type { Cursor } from "../cursor/cursor.js";
import type { Matrix } from "transformation-matrix";

/**
 * Extension of the regular MoveHandler that includes a snap handler.
 * This class can be used as a base class for move handlers that need snapping functionality.
 *
 * @typeParam T - Type of the snap handler, must extend SnapHandler or be undefined
 */
export abstract class SnapMoveHandler<T extends SnapHandler | undefined> extends MoveHandler {
    /**
     * Creates a new SnapMoveHandler
     *
     * @param snapHandler the snap handler to use for snapping
     * @param transformationMatrix matrix applied to event coordinates
     * @param moveCursor the cursor to use while moving
     * @param requiresMove if true, if the action is committed without being moved before, the move is skipped
     */ constructor(
        protected readonly snapHandler: T,
        private readonly snappingEnabled: boolean,
        transformationMatrix: Matrix,
        moveCursor: Cursor | undefined = undefined,
        requiresMove: boolean = true
    ) {
        super(transformationMatrix, moveCursor, requiresMove);
    }

    /**
     * Determines if snapping is currently enabled based on the configuration and modifier keys.
     * Snapping can be toggled by holding the Alt key, which inverts the default snapping behavior.
     *
     * @param event The mouse event to check for modifier keys
     * @returns True if snapping is enabled, false otherwise
     */
    isSnappingEnabled(event: MouseEvent): boolean {
        return this.snappingEnabled != event.altKey;
    }
}
