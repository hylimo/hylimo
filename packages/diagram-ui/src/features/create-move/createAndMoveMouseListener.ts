import { IActionDispatcher, MouseListener, SModelElementImpl, TYPES as SPROTTY_TYPES } from "sprotty";
import { inject } from "inversify";
import { TYPES } from "../types.js";
import { TransactionIdProvider } from "../transaction/transactionIdProvider.js";
import { Action } from "sprotty-protocol";
import { SRoot } from "../../model/sRoot.js";
import { applyToPoint, Matrix } from "transformation-matrix";
import { TransactionalAction } from "@hylimo/diagram-protocol";
import { CreateAndMoveAction } from "./createAndMoveAction.js";

/**
 * The maximum number of updates that can be performed on the same revision.
 * As no prediction is done, this can be more strictly limited than the general move listener.
 */
const maxUpdatesPerRevision = 1;

/**
 * Listener for mouse events to create create actions
 */
export class CreateAndMoveMouseListener extends MouseListener {
    /**
     * The transaction id provider
     */
    @inject(TYPES.TransactionIdProvider) transactionIdProvider!: TransactionIdProvider;

    /**
     * The action dispatcher
     */
    @inject(SPROTTY_TYPES.IActionDispatcher) actionDispatcher!: IActionDispatcher;

    /**
     * The context of the current move
     */
    private context?: {
        /**
         * The edit to perform
         */
        edit: string;
        /**
         * A transformation matrix which directly outputs x/y in the root canvas coordinate system.
         */
        transformationMatrix: Matrix;
        /**
         * The transaction id to use
         */
        transactionId: string;
    };

    /**
     * Sequence number for the next action.
     */
    private sequenceNumber = 0;

    /**
     * Activates the listener, starting a move based on the provided action
     *
     * @param root the root element
     * @param action the action which starts the move
     */
    startMove(root: SRoot, action: CreateAndMoveAction): void {
        this.context = {
            edit: action.edit,
            transformationMatrix: root.getMouseTransformationMatrix(),
            transactionId: this.transactionIdProvider.generateId()
        };
        this.sequenceNumber = 0;
        root.sequenceNumber = 0;
        this.actionDispatcher.dispatchAll(this.generateEditAction(root, action.event, false));
    }

    override mouseMove(target: SModelElementImpl, event: MouseEvent): (Action | Promise<Action>)[] {
        const root = target.root as SRoot;
        const outstandingUpdates = this.sequenceNumber - root.sequenceNumber;
        if (outstandingUpdates > maxUpdatesPerRevision) {
            return [];
        }
        return this.generateEditAction(target, event, false);
    }

    override mouseUp(target: SModelElementImpl, event: MouseEvent): (Action | Promise<Action>)[] {
        return this.generateEditAction(target, event, true);
    }

    override mouseEnter(target: SModelElementImpl, event: MouseEvent): (Action | Promise<Action>)[] {
        if (event.buttons === 0) {
            return this.generateEditAction(target, event, true);
        } else {
            return [];
        }
    }

    /**
     * Generates the edit action based on the target and the event
     *
     * @param target the target element of the event
     * @param event the mouse event providing the coordinates
     * @param committed passed through to the action
     * @returns the edit action
     */
    private generateEditAction(target: SModelElementImpl, event: MouseEvent, committed: boolean): Action[] {
        if (this.context == undefined) {
            return [];
        }
        const edit = {
            values: this.createVariables(target, event),
            types: [this.context.edit],
            elements: [target.root.id]
        };
        const action: TransactionalAction = {
            kind: TransactionalAction.KIND,
            transactionId: this.context.transactionId,
            sequenceNumber: this.sequenceNumber++,
            committed,
            edits: [edit]
        };
        if (committed) {
            this.context = undefined;
        }
        return [action];
    }

    /**
     * Creates the variables for the edit, based on the target and the event
     *
     * @param target the target element of the event, only relevant if targetMode is true
     * @param event the mouse event providing the coordinates
     * @returns the variables for the edit
     */
    private createVariables(
        target: SModelElementImpl,
        event: MouseEvent
    ): { x: number; y: number } | { target: string } {
        if (this.context === undefined) {
            throw new Error("No context");
        }
        return applyToPoint(this.context.transformationMatrix, { x: event.pageX, y: event.pageY });
    }
}
