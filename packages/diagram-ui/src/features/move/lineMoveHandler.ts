import { DefaultEditTypes, LineEngine, Point, TransformedLine } from "@hylimo/diagram-common";
import { MoveHandler } from "./moveHandler.js";
import { Edit, MoveLposEdit } from "@hylimo/diagram-protocol";

/**
 * Move handler for line point moves
 */
export class LineMoveHandler extends MoveHandler {
    /**
     * Creats a new LineMoveHandler
     *
     * @param point the id of the point to move
     * @param transactionId the id of the transaction
     * @param initialPosition the initial position of the point
     * @param onLine if true, the point should be moved on the line only, otherwise a relative point to the line is calculated
     * @param hasSegment if true, the segment index is defined
     * @param line the line on which the point is
     */
    constructor(
        readonly point: string,
        transactionId: string,
        readonly initialPosition: Point,
        readonly onLine: boolean,
        readonly hasSegment: boolean,
        readonly line: TransformedLine
    ) {
        super(transactionId);
    }

    protected override generateEdits(dx: number, dy: number, event: MouseEvent): Edit[] {
        const newPosition: Point = {
            x: this.initialPosition.x + dx,
            y: this.initialPosition.y + dy
        };
        const nearest = LineEngine.DEFAULT.projectPoint(newPosition, this.line);
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
