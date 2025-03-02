import type { IActionDispatcher, SModelElementImpl } from "sprotty";
import { MouseListener } from "sprotty";
import { inject, injectable } from "inversify";
import { TYPES } from "../types.js";
import type { TransactionIdProvider } from "../transaction/transactionIdProvider.js";
import type { Action } from "sprotty-protocol";
import type { SRoot } from "../../model/sRoot.js";
import type { TransactionalMoveAction } from "./transactionalMoveAction.js";
import type { MoveHandler } from "./moveHandler.js";

/**
 * Listener for mouse events to create transactional move operations
 */
@injectable()
export class MoveMouseListener extends MouseListener {
    /**
     * The transaction id provider
     */
    @inject(TYPES.TransactionIdProvider) transactionIdProvider!: TransactionIdProvider;

    /**
     * The action dispatcher
     */
    @inject(TYPES.IActionDispatcher) actionDispatcher!: IActionDispatcher;

    /**
     * The context of the current move
     */
    private context?: {
        /**
         * The transaction id to use
         */
        transactionId: string;
        /**
         * The handler to generate the edits for the move
         */
        handler: MoveHandler;
        /**
         * The maximum number of updates that can be performed on the same revision.
         */
        maxUpdatesPerRevision: number;
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
    startMove(root: SRoot, action: TransactionalMoveAction): void {
        this.context = {
            transactionId: this.transactionIdProvider.generateId(),
            handler: action.handlerProvider(root),
            maxUpdatesPerRevision: action.maxUpdatesPerRevision
        };
        this.sequenceNumber = 0;
        root.sequenceNumber = 0;
    }

    override mouseMove(target: SModelElementImpl, event: MouseEvent): (Action | Promise<Action>)[] {
        const root = target.root as SRoot;
        const outstandingUpdates = this.sequenceNumber - root.sequenceNumber;
        if (this.context == undefined || outstandingUpdates > this.context.maxUpdatesPerRevision) {
            return [];
        }
        return this.generateActions(target, event, event.buttons === 0);
    }

    override mouseUp(target: SModelElementImpl, event: MouseEvent): (Action | Promise<Action>)[] {
        return this.generateActions(target, event, true);
    }

    override mouseEnter(target: SModelElementImpl, event: MouseEvent): (Action | Promise<Action>)[] {
        if (event.buttons === 0) {
            return this.generateActions(target, event, true);
        } else {
            return [];
        }
    }

    /**
     * Generates the edit action(s) based on the target and the event
     *
     * @param target the target element of the event
     * @param event the mouse event providing the coordinates
     * @param committed passed through to the action
     * @returns the edit action
     */
    private generateActions(target: SModelElementImpl, event: MouseEvent, committed: boolean): Action[] {
        if (this.context == undefined) {
            return [];
        }
        const actions = this.context.handler.generateActions(
            target,
            event,
            committed,
            this.context.transactionId,
            this.sequenceNumber++
        );
        if (committed) {
            this.context = undefined;
        }
        return actions;
    }
}
