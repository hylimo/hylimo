import type { TransformedLine } from "@hylimo/diagram-common";
import { DefaultEditTypes, LineEngine } from "@hylimo/diagram-common";
import type { MoveLposEdit } from "@hylimo/diagram-protocol";
import type { Matrix } from "transformation-matrix";
import { MoveHandler, type HandleMoveResult } from "../../move/moveHandler.js";

/**
 * Move handler for line point moves
 * Expects relative coordinates to the point in the parent canvas coordinate system.
 */
export class LineMoveHandler extends MoveHandler {
    /**
     * Creats a new LineMoveHandler
     *
     * @param point the id of the point to move
     * @param editPos if true, the position of the point can be modified
     * @param editDist if true, the distance to the line can be modified
     * @param hasSegment if true, the segment index is defined
     * @param line the line on which the point is
     * @param transformationMatrix the transformation matrix to apply to obtain the relative position
     */
    constructor(
        readonly point: string,
        readonly editPos: boolean,
        readonly editDist: boolean,
        readonly hasSegment: boolean,
        readonly line: TransformedLine,
        transformMatrix: Matrix
    ) {
        super(transformMatrix, "cursor-move");
    }

    override handleMove(x: number, y: number): HandleMoveResult {
        const nearest = LineEngine.DEFAULT.projectPoint({ x, y }, this.line);
        let pos: number | [number, number];
        if (this.hasSegment) {
            pos = [nearest.segment, nearest.relativePos];
        } else {
            pos = nearest.pos;
        }
        const types: MoveLposEdit["types"] = [];
        if (this.editPos) {
            types.push(DefaultEditTypes.MOVE_LPOS_POS);
        }
        if (this.editDist) {
            types.push(DefaultEditTypes.MOVE_LPOS_DIST);
        }
        const edits = [
            {
                types,
                values: { pos, dist: this.editDist ? nearest.distance : 0 },
                elements: [this.point]
            } satisfies MoveLposEdit
        ];
        return { edits };
    }
}
