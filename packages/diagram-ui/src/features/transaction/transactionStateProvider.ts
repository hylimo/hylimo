import { TransactionalAction } from "@hylimo/diagram-protocol";
import { injectable } from "inversify";
import type { IActionHandler, ICommand } from "sprotty";
import type { Action } from "sprotty-protocol";

/**
 * Provider for the current transaction state
 */
@injectable()
export class TransactionStateProvider implements IActionHandler {
    /**
     * Whether the server is currently in a transaction
     */
    isInTransaction: boolean = false;
    /**
     * The types of the current transaction.
     * If undefined, no transaction is in progress.
     */
    types: string[] | undefined = undefined;

    /**
     * Whether the current transaction is a create connection transaction
     */
    get isInCreateConnectionTransaction(): boolean {
        const types = this.types;
        return types != undefined && types.length === 1 && types[0].startsWith("connection/");
    }

    handle(action: Action): ICommand | Action | void {
        if (TransactionalAction.isTransactionalAction(action)) {
            this.isInTransaction = !action.committed;
            if (action.committed) {
                this.types = undefined;
            } else if (this.types == undefined) {
                this.types = action.edits.flatMap((edit) => edit.types ?? []);
            }
        }
    }
}
