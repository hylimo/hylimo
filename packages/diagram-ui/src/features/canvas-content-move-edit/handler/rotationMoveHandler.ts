import { DefaultEditTypes, Point } from "@hylimo/diagram-common";
import { MoveHandler, type HandleMoveResult } from "../../move/moveHandler.js";
import type { Edit, RotateEdit } from "@hylimo/diagram-protocol";
import type { Matrix } from "transformation-matrix";
import { decomposeTSR, fromTwoMovingPoints } from "transformation-matrix";

/**
 * Move handler for rotating CanvasElements
 * Expects relative coordinates to the rotation origin in its own coordinate system
 */
export class RotationMoveHandler extends MoveHandler {
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
        super(transformMatrix, "cursor-grab");
    }

    override handleMove(x: number, y: number): HandleMoveResult {
        const rotationIconPosition: Point = { x: 0, y: -1 };
        const mousePosition: Point = { x, y };
        const { rotation } = decomposeTSR(
            fromTwoMovingPoints(Point.ORIGIN, rotationIconPosition, Point.ORIGIN, mousePosition)
        );
        let newRotation = this.currentRotation + rotation.angle * (180 / Math.PI);
        while (newRotation < 0) {
            newRotation += 360;
        }
        const edits = [
            {
                types: [DefaultEditTypes.ROTATE],
                values: { rotation: newRotation },
                elements: [this.element]
            } satisfies RotateEdit
        ];
        return { edits };
    }
}
