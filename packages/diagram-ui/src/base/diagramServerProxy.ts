import {
    NavigateToSourceAction,
    TransactionalAction,
    RemoteUndoAction,
    RemoteRedoAction
} from "@hylimo/diagram-protocol";
import { injectable } from "inversify";
import { ActionHandlerRegistry, DiagramServerProxy as SprottyDiagramServerProxy } from "sprotty";
import { Action } from "sprotty-protocol";

/**
 * DiagramServerProxy which handles additional commands
 */
@injectable()
export abstract class DiagramServerProxy extends SprottyDiagramServerProxy {
    /**
     * Whether the server is currently in a transaction
     */
    private inTransaction = false;

    override initialize(registry: ActionHandlerRegistry): void {
        super.initialize(registry);

        registry.register(TransactionalAction.KIND, this);
        registry.register(NavigateToSourceAction.KIND, this);
        registry.register(RemoteUndoAction.KIND, this);
        registry.register(RemoteRedoAction.KIND, this);
    }

    protected override handleLocally(action: Action): boolean {
        if (RemoteUndoAction.isRemoteUndoAction(action)) {
            this.handleUndo();
            return false;
        }
        if (RemoteRedoAction.isRemoteRedoAction(action)) {
            this.handleRedo();
            return false;
        }
        if (TransactionalAction.isTransactionalAction(action)) {
            if (action.committed) {
                this.handleTransactionCommit();
                this.inTransaction = false;
            } else if (!this.inTransaction) {
                this.handleTransactionStart();
                this.inTransaction = true;
            }
            return true;
        }
        return super.handleLocally(action);
    }

    /**
     * Handles an undo action
     */
    protected abstract handleUndo(): void;

    /**
     * Handles a redo action
     */
    protected abstract handleRedo(): void;

    /**
     * Handles the start of a transaction
     */
    protected abstract handleTransactionStart(): void;

    /**
     * Handles the end of a transaction
     */
    protected abstract handleTransactionCommit(): void;
}
