import { injectable } from "inversify";
import type { IActionHandler } from "sprotty";
import type { Action } from "sprotty-protocol";
import { UpdateSnapLinesAction } from "./updateSnapLines.js";
import { TransactionalAction } from "@hylimo/diagram-protocol";
import type { SRoot } from "../../model/sRoot.js";
import type { SCanvas } from "../../model/canvas/sCanvas.js";
import type { SnapLine } from "./snapping.js";

/**
 * State manager for snap lines
 */
@injectable()
export class SnapLinesStateManager implements IActionHandler {
    /**
     * Lookup for registered snap lines
     * Entries are sorted by the sequence number of the transaction
     */
    private readonly snapLinesLookup: Map<string, UpdateSnapLinesAction[]> = new Map();

    /**
     * Ids of commited transactions
     * Entries for these are removed as soon as possible
     */
    private readonly commitedTransactionIds: Set<string> = new Set();

    handle(action: Action): void {
        if (UpdateSnapLinesAction.is(action)) {
            if (!this.snapLinesLookup.has(action.transactionId)) {
                this.snapLinesLookup.set(action.transactionId, []);
            }
            const snapLines = this.snapLinesLookup.get(action.transactionId)!;
            snapLines.push(action);
        } else if (TransactionalAction.isTransactionalAction(action)) {
            if (action.committed) {
                this.commitedTransactionIds.add(action.transactionId);
            }
        }
    }

    /**
     * Returns the snap lines for the given context
     * Also cleans up the state and removes no longer needed entries
     * 
     * @param context the context to get the snap lines for
     * @returns the snap lines for the given context
     */
    getSnapLines(context: Readonly<SRoot | SCanvas>): SnapLine[] {
        if (this.commitedTransactionIds.size > 0) {
            this.commitedTransactionIds.forEach((transactionId) => {
                this.snapLinesLookup.delete(transactionId);
            });
            this.commitedTransactionIds.clear();
        }
        const root = context.root as SRoot;
        const transactionState = root.transactionState;
        if (transactionState == undefined) {
            return [];
        }
        const actions = this.snapLinesLookup.get(transactionState.id);
        if (actions == undefined) {
            return [];
        }
        while (actions.length > 0 && actions[0].sequenceNumber < transactionState.sequenceNumber) {
            actions.shift();
        }
        const action = actions[0];
        if (action?.sequenceNumber === transactionState.sequenceNumber) {
            return action.snapLines.get(context.id) ?? [];
        }
        return [];
    }
}
