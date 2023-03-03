import { Point } from "@hylimo/diagram-common";
import { RotationAction } from "@hylimo/diagram-protocol";
import { MoveHandler } from "./moveHandler";

/**
 * Move handler for rotating CanvasElements
 */
export class RotationHandler implements MoveHandler {
    /**
     * Creates a new RotationHandler
     *
     * @param element the id of the CanvasElement to move
     * @param transactionId the id of the transaction
     * @param origin the rotation origin
     * @param initialPosition the initial position of the rotation handle
     */
    constructor(
        readonly element: string,
        readonly transactionId: string,
        readonly origin: Point,
        readonly initialPosition: Point
    ) {}

    generateAction(dx: number, dy: number, sequenceNumber: number, commited: boolean): RotationAction {
        const newPosition: Point = {
            x: this.initialPosition.x + dx,
            y: this.initialPosition.y + dy
        };
        let newRotation =
            (Math.atan2(newPosition.y - this.origin.y, newPosition.x - this.origin.x) / (2 * Math.PI)) * 360 + 90;
        if (newRotation < 0) {
            newRotation += 360;
        }
        return {
            kind: RotationAction.KIND,
            element: this.element,
            rotation: newRotation,
            transactionId: this.transactionId,
            commited,
            sequenceNumber
        };
    }
}
