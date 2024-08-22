import { DefaultEditTypes, Point } from "@hylimo/diagram-common";
import { MoveHandler } from "./moveHandler.js";
import { Edit, RotateEdit } from "@hylimo/diagram-protocol";

/**
 * Move handler for rotating CanvasElements
 */
export class RotationHandler extends MoveHandler {
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
        transactionId: string,
        readonly origin: Point,
        readonly initialPosition: Point
    ) {
        super(transactionId);
    }

    protected override generateEdits(dx: number, dy: number): Edit[] {
        const newPosition: Point = {
            x: this.initialPosition.x + dx,
            y: this.initialPosition.y + dy
        };
        let newRotation =
            (Math.atan2(newPosition.y - this.origin.y, newPosition.x - this.origin.x) / (2 * Math.PI)) * 360 + 90;
        if (newRotation < 0) {
            newRotation += 360;
        }
        return [
            {
                types: [DefaultEditTypes.ROTATE],
                values: { rotation: newRotation },
                elements: [this.element]
            } satisfies RotateEdit
        ];
    }
}
