import { Edit, TransactionalAction } from "@hylimo/diagram-protocol";
import { SModelElementImpl } from "sprotty";
import { Matrix, applyToPoint } from "transformation-matrix";

/**
 * Handler which can handle transactional move operations
 */
export abstract class MoveHandler {
    /**
     * If true, the mouse has been moved
     */
    protected hasMoved = false;

    /**
     * Creates a new MoveHandler
     *
     * @param transformationMatrix matrix applied to event coordinates
     * @param requiresMove if true, if the action is committed without being moved before, the move is skipped
     */
    constructor(
        protected readonly transformationMatrix: Matrix,
        protected readonly requiresMove: boolean = true
    ) {}

    /**
     * Generates the action(s) based on the target and the event
     *
     * @param target the target element of the event
     * @param event the mouse event providing the coordinates
     * @param committed passed through to the action
     * @param transactionId the transaction id
     * @param sequenceNumber the sequence number
     * @returns the edit action
     */
    generateActions(
        target: SModelElementImpl,
        event: MouseEvent,
        committed: boolean,
        transactionId: string,
        sequenceNumber: number
    ): TransactionalAction[] {
        if (!committed) {
            this.hasMoved = true;
        }
        if (committed && this.requiresMove && !this.hasMoved) {
            return [];
        }
        const { x, y } = applyToPoint(this.transformationMatrix, { x: event.pageX, y: event.pageY });
        const action: TransactionalAction = {
            kind: TransactionalAction.KIND,
            transactionId: transactionId,
            sequenceNumber: sequenceNumber,
            committed,
            edits: this.generateEdits(x, y, event, target)
        };
        return [action];
    }

    /**
     * Generates the edits for the move
     *
     * @param x the x coordinate in the root canvas coordinate system
     * @param y the y coordinate in the root canvas coordinate system
     * @param event the causing mouse event
     * @param target the target of the mouse event
     * @returns the generated edit
     */
    abstract generateEdits(x: number, y: number, event: MouseEvent, target: SModelElementImpl): Edit[];
}
