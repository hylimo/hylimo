import type { Edit, TransactionalAction } from "@hylimo/diagram-protocol";
import { MoveHandler } from "../../move/moveHandler.js";

/**
 * Move handler that does nothing
 * Can be used as fallback if no move handler is available
 */
export class NoopMoveHandler extends MoveHandler {
    override generateActions(): TransactionalAction[] {
        return [];
    }

    override generateEdits(): Edit[] {
        return [];
    }
}
