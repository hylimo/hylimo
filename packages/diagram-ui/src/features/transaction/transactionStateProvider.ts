import { TransactionalAction } from "@hylimo/diagram-protocol";
import { injectable } from "inversify";
import { IActionHandler, ICommand } from "sprotty";
import { Action } from "sprotty-protocol";

/**
 * Provider for the current transaction state
 */
@injectable()
export class TransactionStateProvider implements IActionHandler {
    /**
     * Whether the server is currently in a transaction
     */
    isInTransaction: boolean = false;

    handle(action: Action): ICommand | Action | void {
        if (TransactionalAction.isTransactionalAction(action)) {
            this.isInTransaction = !action.committed;
        }
    }
}
