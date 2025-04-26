import { DefaultEditTypes } from "@hylimo/diagram-common";
import type { Edit, ResizeEdit } from "@hylimo/diagram-protocol";
import type { Matrix } from "transformation-matrix";
import { MoveHandler, type HandleMoveResult } from "../../move/moveHandler.js";
import type { ResizeMoveCursor } from "../../cursor/cursor.js";

/**
 * Elements with an optional original width and height.
 * If originalWidth is given, all elements in the group have the same original width.
 * If originalHeight is given, all elements in the group have the same original height.
 * At least one of the two must be given.
 */
export interface ElementsGroupedBySize {
    elements: string[];
    originalWidth?: number;
    originalHeight?: number;
}

/**
 * A move handler that resizes the elements.
 * Expects relative coordinates to its own coordinate system.
 */
export class ResizeMoveHandler extends MoveHandler {
    /**
     * Creates a new ResizeHandler.
     *
     * @param scaleX the scale factor in x direction. The resize is scaled by this to account for resize in the opposite direction.
     * @param scaleY the scale factor in y direction. The resize is scaled by this to account for resize in the opposite direction.
     * @param originalWidth the original width of the primary resize element, used to calculate the resize factor.
     * @param originalHeight the original height of the primary resize element, used to calculate the resize factor.
     * @param groupedElements the elements grouped by size.
     * @param transformationMatrix the transformation matrix to apply to obtain the relative position.
     * @param moveCursor the cursor to use while resizing.
     */
    constructor(
        private readonly scaleX: number | undefined,
        private readonly scaleY: number | undefined,
        private readonly originalWidth: number,
        private readonly originalHeight: number,
        private readonly groupedElements: ElementsGroupedBySize[],
        transformationMatrix: Matrix,
        moveCursor: ResizeMoveCursor | undefined
    ) {
        super(transformationMatrix, moveCursor);
    }

    override handleMove(x: number, y: number, event: MouseEvent): HandleMoveResult {
        let factorX: number | undefined = undefined;
        let factorY: number | undefined = undefined;

        if (this.scaleX !== undefined) {
            factorX = Math.abs((x * this.scaleX + this.originalWidth) / this.originalWidth);
        }
        if (this.scaleY !== undefined) {
            factorY = Math.abs((y * this.scaleY + this.originalHeight) / this.originalHeight);
        }
        if (event.shiftKey && factorX != undefined && factorY != undefined) {
            const uniformFactor = Math.max(factorX, factorY);
            factorX = uniformFactor;
            factorY = uniformFactor;
        }
        const edits: Edit[] = [];
        for (const group of this.groupedElements) {
            const values: ResizeEdit["values"] = {};
            const types: ResizeEdit["types"] = [];
            if (factorX != undefined) {
                values.width = group.originalWidth! * factorX;
                values.dw = values.width - group.originalWidth!;
                types.push(DefaultEditTypes.RESIZE_WIDTH);
            }
            if (factorY != undefined) {
                values.height = group.originalHeight! * factorY;
                values.dh = values.height - group.originalHeight!;
                types.push(DefaultEditTypes.RESIZE_HEIGHT);
            }
            edits.push({
                types,
                elements: group.elements,
                values
            } satisfies ResizeEdit);
        }
        return { edits };
    }
}
