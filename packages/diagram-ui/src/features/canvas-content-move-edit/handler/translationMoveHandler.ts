import { Edit, MoveEdit } from "@hylimo/diagram-protocol";
import { MoveHandler } from "../../move/moveHandler.js";
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
 * Move handler for translations of absolute and relative points.
 * Expects relative coordinates in the root canvas coordinate system.
 */
export class TranslationMoveHandler extends MoveHandler {
    /**
     * Creats a new TranslateMovehandler
     *
     * @param elements the ids of the points to move
     * @param transformationMatrix the transformation matrix to apply to obtain the relative position
     */
    constructor(
        readonly elements: ElementsGroupedByTransformation[],
        transformationMatrix: Matrix
    ) {
        super(transformationMatrix, "cursor-move");
    }

    override generateEdits(x: number, y: number, event: MouseEvent): Edit[] {
        let offsetX = x;
        let offsetY = y;
        if (event.shiftKey) {
            if (Math.abs(x) > Math.abs(y)) {
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
