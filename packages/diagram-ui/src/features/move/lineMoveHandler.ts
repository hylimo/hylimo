import { LineEngine, LineMoveAction, Point, TransformedLine } from "@hylimo/diagram-common";
import { MoveHandler } from "./moveHandler";

/**
 * Move handler for line point moves
 */
export class LineMoveHandler implements MoveHandler {
    /**
     * Creats a new LineMoveHandler
     *
     * @param point the id of the point to move
     * @param transactionId the id of the transaction
     * @param initialPosition the initial position of the point
     * @param line the line on which the point is
     */
    constructor(
        readonly point: string,
        readonly transactionId: string,
        readonly initialPosition: Point,
        readonly line: TransformedLine
    ) {}

    generateAction(dx: number, dy: number, commited: boolean): LineMoveAction {
        const newPosition: Point = {
            x: this.initialPosition.x + dx,
            y: this.initialPosition.y + dy
        };
        const nearest = LineEngine.DEFAULT.getNearestPoint(newPosition, this.line);
        return {
            kind: LineMoveAction.KIND,
            point: this.point,
            pos: nearest,
            transactionId: this.transactionId,
            commited
        };
    }
}
