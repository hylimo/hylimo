import { DefaultEditTypes } from "@hylimo/diagram-common";
import { MoveHandler } from "../../move/moveHandler.js";
import { Edit, RotateEdit } from "@hylimo/diagram-protocol";
import { Matrix } from "transformation-matrix";

/**
 * Move handler for rotating CanvasElements
 * Expects relative coordinates to the rotation origin in its own coordinate system
 */
export class RotationHandler extends MoveHandler {
    /**
     * Creates a new RotationHandler
     *
     * @param element the id of the CanvasElement to move
     * @param currentRotation the current rotation of the element in degrees
     * @param transformationMatrix transformation matrix to apply to obtain the relative position
     */
    constructor(
        readonly element: string,
        readonly currentRotation: number,
        transformMatrix: Matrix
    ) {
        super(transformMatrix);
    }

    override generateEdits(x: number, y: number): Edit[] {
        let newRotation = (Math.atan2(y, x) / (2 * Math.PI)) * 360 + this.currentRotation - 270;
        while (newRotation < 0) {
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
