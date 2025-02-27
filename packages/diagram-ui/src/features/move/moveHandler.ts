import { Edit, TransactionalAction } from "@hylimo/diagram-protocol";
import { SModelElementImpl } from "sprotty";
import { Matrix, applyToPoint } from "transformation-matrix";
import { Cursor, UpdateCursorAction } from "../cursor/cursor.js";
import { Action } from "sprotty-protocol";

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
     * @param moveCursor the cursor to use while moving
     * @param requiresMove if true, if the action is committed without being moved before, the move is skipped
     */
    constructor(
        protected readonly transformationMatrix: Matrix,
        readonly moveCursor: Cursor | undefined,
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
    ): Action[] {
        if (committed && this.requiresMove && !this.hasMoved) {
            return [];
        }
        const actions: Action[] = [];
        if (this.moveCursor != undefined && (!this.hasMoved || committed)) {
            const moveCursorAction: UpdateCursorAction = {
                kind: UpdateCursorAction.KIND,
                moveCursor: committed ? null : this.moveCursor
            };
            actions.push(moveCursorAction);
        }
        if (!committed) {
            this.hasMoved = true;
        }
        const { x, y } = applyToPoint(this.transformationMatrix, { x: event.pageX, y: event.pageY });
        const transactionalAction: TransactionalAction = {
            kind: TransactionalAction.KIND,
            transactionId: transactionId,
            sequenceNumber: sequenceNumber,
            committed,
            edits: this.generateEdits(x, y, event, target)
        };
        actions.push(transactionalAction);
        return actions;
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
