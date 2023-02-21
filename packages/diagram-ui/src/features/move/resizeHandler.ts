import { ResizeAction } from "@hylimo/diagram-common";
import { MoveHandler } from "./moveHandler";

/**
 * A move handler that resizes the elements.
 */
export class ResizeHandler implements MoveHandler {
    /**
     * Creates a new ResizeHandler.
     *
     * @param elements The elements to resize.
     * @param transactionId The transaction id.
     * @param originalWidth the original width of the primary resize element, used to calculate the resize factor.
     * @param originalHeight the original height of the primary resize element, used to calculate the resize factor.
     * @param scaleX the scale factor in x direction. The resize is scaled by this to account for resize in the opposite direction.
     * @param scaleY the scale factor in y direction. The resize is scaled by this to account for resize in the opposite direction.
     */
    constructor(
        readonly elements: string[],
        readonly transactionId: string,
        readonly originalWidth: number,
        readonly originalHeight: number,
        readonly scaleX?: number,
        readonly scaleY?: number
    ) {}

    generateAction(dx: number, dy: number, commited: boolean): ResizeAction {
        let factorX: number | undefined = undefined;
        let factorY: number | undefined = undefined;
        if (this.scaleX !== undefined) {
            factorX = (dx * this.scaleX + this.originalWidth) / this.originalWidth;
        }
        if (this.scaleY !== undefined) {
            factorY = (dy * this.scaleY + this.originalHeight) / this.originalHeight;
        }
        return {
            kind: ResizeAction.KIND,
            transactionId: this.transactionId,
            elements: this.elements,
            factorX,
            factorY,
            commited
        };
    }
}
