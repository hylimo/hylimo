import { DefaultEditTypes, Math2D } from "@hylimo/diagram-common";
import { MoveHandler } from "./moveHandler.js";
import { Edit, ResizeEdit } from "@hylimo/diagram-protocol";

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
 */
export class ResizeHandler extends MoveHandler {
    /**
     * The rotation of the primary resize element, in radians.
     */
    private readonly rotation: number;

    /**
     * Creates a new ResizeHandler.
     *
     * @param transactionId The transaction id.
     * @param rotation the rotation of the primary resize element, in degrees.
     * @param scaleX the scale factor in x direction. The resize is scaled by this to account for resize in the opposite direction.
     * @param scaleY the scale factor in y direction. The resize is scaled by this to account for resize in the opposite direction.
     * @param originalWidth the original width of the primary resize element, used to calculate the resize factor.
     * @param originalHeight the original height of the primary resize element, used to calculate the resize factor.
     * @param groupedElements the elements grouped by size.
     */
    constructor(
        transactionId: string,
        rotation: number,
        private readonly scaleX: number | undefined,
        private readonly scaleY: number | undefined,
        private readonly originalWidth: number,
        private readonly originalHeight: number,
        private readonly groupedElements: ElementsGroupedBySize[]
    ) {
        super(transactionId);
        this.rotation = rotation * (Math.PI / 180);
    }

    protected override generateEdits(dx: number, dy: number): Edit[] {
        let factorX: number | undefined = undefined;
        let factorY: number | undefined = undefined;
        const normalizedDelta = Math2D.rotate({ x: dx, y: dy }, -this.rotation);

        if (this.scaleX !== undefined) {
            factorX = Math.abs((normalizedDelta.x * this.scaleX + this.originalWidth) / this.originalWidth);
        }
        if (this.scaleY !== undefined) {
            factorY = Math.abs((normalizedDelta.y * this.scaleY + this.originalHeight) / this.originalHeight);
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
        return edits;
    }
}
