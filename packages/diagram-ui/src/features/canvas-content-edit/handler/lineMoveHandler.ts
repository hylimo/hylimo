import { DefaultEditTypes, LineEngine, TransformedLine } from "@hylimo/diagram-common";
import { Edit, MoveLposEdit } from "@hylimo/diagram-protocol";
import { Matrix } from "transformation-matrix";
import { MoveHandler } from "../../move/moveHandler.js";

/**
 * Move handler for line point moves
 * Expects relative coordinates to the point in the parent canvas coordinate system.
 */
export class LineMoveHandler extends MoveHandler {
    /**
     * Creats a new LineMoveHandler
     *
     * @param point the id of the point to move
     * @param onLine if true, the point should be moved on the line only, otherwise a relative point to the line is calculated
     * @param hasSegment if true, the segment index is defined
     * @param line the line on which the point is
     * @param transformationMatrix the transformation matrix to apply to obtain the relative position
     */
    constructor(
        readonly point: string,
        readonly onLine: boolean,
        readonly hasSegment: boolean,
        readonly line: TransformedLine,
        transformMatrix: Matrix
    ) {
        super(transformMatrix);
    }

    override generateEdits(x: number, y: number): Edit[] {
        const nearest = LineEngine.DEFAULT.projectPoint({ x, y }, this.line);
        let pos: number | [number, number];
        if (this.hasSegment) {
            pos = [nearest.segment, nearest.relativePos];
        } else {
            pos = nearest.pos;
        }
        const types: MoveLposEdit["types"] = [DefaultEditTypes.MOVE_LPOS_POS];
        if (!this.onLine) {
            types.push(DefaultEditTypes.MOVE_LPOS_DIST);
        }
        return [
            {
                types,
                values: { pos, dist: this.onLine ? 0 : nearest.distance },
                elements: [this.point]
            } satisfies MoveLposEdit
        ];
    }
}
