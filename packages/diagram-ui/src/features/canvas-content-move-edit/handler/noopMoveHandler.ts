import type { TransactionalAction } from "@hylimo/diagram-protocol";
import { MoveHandler, type HandleMoveResult } from "../../move/moveHandler.js";

/**
 * Move handler that does nothing
 * Can be used as fallback if no move handler is available
 */
export class NoopMoveHandler extends MoveHandler {
    override generateActions(): TransactionalAction[] {
        return [];
    }

    override handleMove(): HandleMoveResult {
        return { edits: [] };
    }
}
