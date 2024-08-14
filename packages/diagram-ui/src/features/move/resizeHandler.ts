import { Math2D } from "@hylimo/diagram-common";
import { ResizeAction } from "@hylimo/diagram-protocol";
import { MoveHandler } from "./moveHandler.js";

/**
 * A move handler that resizes the elements.
 */
export class ResizeHandler implements MoveHandler {
    /**
     * The rotation of the primary resize element, in radians.
     */
    private readonly rotation: number;

    /**
     * Creates a new ResizeHandler.
     *
     * @param elements The elements to resize.
     * @param transactionId The transaction id.
     * @param originalWidth the original width of the primary resize element, used to calculate the resize factor.
     * @param originalHeight the original height of the primary resize element, used to calculate the resize factor.
     * @param rotation the rotation of the primary resize element, in degrees.
     * @param scaleX the scale factor in x direction. The resize is scaled by this to account for resize in the opposite direction.
     * @param scaleY the scale factor in y direction. The resize is scaled by this to account for resize in the opposite direction.
     */
    constructor(
        readonly elements: string[],
        readonly transactionId: string,
        readonly originalWidth: number,
        readonly originalHeight: number,
        rotation: number,
        readonly scaleX?: number,
        readonly scaleY?: number
    ) {
        this.rotation = rotation * (Math.PI / 180);
    }

    generateAction(dx: number, dy: number, sequenceNumber: number, commited: boolean): ResizeAction {
        let factorX: number | undefined = undefined;
        let factorY: number | undefined = undefined;
        const normalizedDelta = Math2D.rotate({ x: dx, y: dy }, -this.rotation);

        if (this.scaleX !== undefined) {
            factorX = (normalizedDelta.x * this.scaleX + this.originalWidth) / this.originalWidth;
        }
        if (this.scaleY !== undefined) {
            factorY = (normalizedDelta.y * this.scaleY + this.originalHeight) / this.originalHeight;
        }
        return {
            kind: ResizeAction.KIND,
            transactionId: this.transactionId,
            elements: this.elements,
            factorX,
            factorY,
            commited,
            sequenceNumber
        };
    }
}
