import { Edit, MoveEdit } from "@hylimo/diagram-protocol";
import { MoveHandler } from "./moveHandler.js";
import { DefaultEditTypes } from "@hylimo/diagram-common";
import { Matrix, applyToPoint } from "transformation-matrix";

/**
 * Entry for a translation move operation
 */
export interface ElementsGroupedByTransformation {
    /**
     * The transformation applied to the dx and dy values
     */
    transformation: Matrix;
    /**
     * The elements to move
     */
    elements: string[];
}

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
        readonly elements: ElementsGroupedByTransformation[],
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
        return this.elements.map(({ elements, transformation }) => {
            const transformed = applyToPoint(transformation, { x: offsetX, y: offsetY });
            return {
                types: [DefaultEditTypes.MOVE_X, DefaultEditTypes.MOVE_Y],
                values: { dx: transformed.x, dy: transformed.y },
                elements
            } satisfies MoveEdit;
        });
    }
}
