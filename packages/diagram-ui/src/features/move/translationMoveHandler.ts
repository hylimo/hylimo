import { Edit, MoveEdit } from "@hylimo/diagram-protocol";
import { MoveHandler } from "./moveHandler.js";
import { DefaultEditTypes } from "@hylimo/diagram-common";

/**
 * Move handler for translations of absolute and relative points
 */
export class TranslationMoveHandler extends MoveHandler {
    /**
     * Creats a new TranslateMovehandler
     *
     * @param elements the ids of the points to move
     * @param transactionId the id of the transaction
     */
    constructor(
        readonly elements: string[],
        transactionId: string
    ) {
        super(transactionId);
    }

    protected override generateEdits(dx: number, dy: number, event: MouseEvent): Edit[] {
        let offsetX = dx;
        let offsetY = dy;
        if (event.shiftKey) {
            if (Math.abs(dx) > Math.abs(dy)) {
                offsetY = 0;
            } else {
                offsetX = 0;
            }
        }
        return [
            {
                types: [DefaultEditTypes.MOVE_X, DefaultEditTypes.MOVE_Y],
                values: { dx: offsetX, dy: offsetY },
                elements: this.elements
            } satisfies MoveEdit
        ];
    }
}
