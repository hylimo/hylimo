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
     * @param groupedElements the elements grouped by size.
     */
    constructor(
        transactionId: string,
        rotation: number,
        private readonly scaleX: number | undefined,
        private readonly scaleY: number | undefined,
        private readonly groupedElements: ElementsGroupedBySize[]
    ) {
        super(transactionId);
        this.rotation = rotation * (Math.PI / 180);
    }

    protected override generateEdits(dx: number, dy: number, event: MouseEvent): Edit[] {
        const edits: Edit[] = [];
        const normalizedDelta = Math2D.rotate({ x: dx, y: dy }, -this.rotation);
        for (const group of this.groupedElements) {
            let dw: number | undefined = undefined;
            let dh: number | undefined = undefined;
            let width: number | undefined = undefined;
            let height: number | undefined = undefined;
            const types: ResizeEdit["types"] = [];
            if (this.scaleX != undefined) {
                dw = normalizedDelta.x * this.scaleX;
                width = group.originalWidth! + dw;
                types.push(DefaultEditTypes.RESIZE_WIDTH);
            }
            if (this.scaleY != undefined) {
                dh = normalizedDelta.y * this.scaleY;
                height = group.originalHeight! + dh;
                types.push(DefaultEditTypes.RESIZE_HEIGHT);
            }
            edits.push({
                types,
                elements: group.elements,
                values: {
                    width,
                    height,
                    dw,
                    dh
                }
            } satisfies ResizeEdit);
        }

        return edits;
    }
}
