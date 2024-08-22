import { BaseLayoutedDiagram } from "@hylimo/diagram-common";
import { IncrementalUpdate, TransactionalAction } from "@hylimo/diagram-protocol";
import { TextDocumentContentChangeEvent } from "vscode-languageserver-textdocument";
import { Diagram } from "../diagram/diagram.js";
import { EditHandlerRegistry } from "./handlers/editHandlerRegistry.js";
import { SharedDiagramUtils } from "../sharedDiagramUtils.js";
import { TransactionalEdit } from "./edit/transactionalEdit.js";

/**
 * Handles TransactionActions modifying the textdocument
 */
export class TransactionManager {
    /**
     * Current transactionId
     */
    private currentTransactionId?: string;
    /**
     * Current edit handling actions of the same transaction
     */
    private edit?: TransactionalEdit;
    /**
     * Last action which caused a text update
     */
    private lastAppliedAction?: TransactionalAction;
    /**
     * Last action which was handled or skipped
     */
    private lastKnownAction?: TransactionalAction;
    /**
     * If true, the diagram has been updated since the last text update,
     * meaning a new text update is possible
     */
    private hasUpdatedDiagram = true;

    /**
     * Returns true if the manager is currently handling a transaction
     */
    get isActive(): boolean {
        return this.currentTransactionId != undefined;
    }

    /**
     * Creates a new TransactionManager which handles edits to the specified textDocument
     *
     * @param diagram the associated Diagram
     * @param registry the registry to use
     * @param utils the shared diagram utils
     */
    constructor(
        private readonly diagram: Diagram,
        private readonly registry: EditHandlerRegistry,
        private readonly utils: SharedDiagramUtils
    ) {}

    /**
     * Handles an action. Does currently not support concurrent/interleaved transactions
     * Every action causes an incremental update.
     * Also, a relayout is scheduled if possible.
     *
     * @param action the action to handle
     * @returns the incremental updates
     */
    async handleAction(action: TransactionalAction): Promise<IncrementalUpdate[]> {
        if (this.currentTransactionId != undefined && this.currentTransactionId != action.transactionId) {
            // eslint-disable-next-line no-console
            console.error("Concurrent transactions are not supported yet");
            this.resetActionState();
        }
        if (this.currentTransactionId == action.transactionId && this.edit == undefined) {
            return [];
        }
        this.currentTransactionId = action.transactionId;
        if (this.edit == undefined) {
            this.edit = new TransactionalEdit(action, this.diagram, this.registry);
        }
        this.edit.transformEdit(action, this.utils.config);
        const result = this.createHandleActionResult(action);
        this.lastKnownAction = action;
        await this.updateTextDocumentIfPossible();
        return result;
    }

    /**
     * Updates the text document if possible, meaning if the last known action has not been applied yet.
     */
    private async updateTextDocumentIfPossible() {
        if (
            this.edit != undefined &&
            this.lastKnownAction != undefined &&
            this.lastKnownAction != this.lastAppliedAction &&
            this.hasUpdatedDiagram
        ) {
            this.hasUpdatedDiagram = false;
            const textDocumentEdit = await this.edit.applyAction(this.lastKnownAction);
            this.lastAppliedAction = this.lastKnownAction;
            this.diagram.applyEdit(textDocumentEdit);
            this.lastAppliedAction = this.lastKnownAction;
        }
        if (this.lastAppliedAction?.commited) {
            this.resetActionState();
        }
    }

    /**
     * Resets currentTransactionId, edit, lastKnownAction and lastAppliedAction.
     * Usually called after an action commits.
     */
    private resetActionState(): void {
        this.currentTransactionId = undefined;
        this.edit = undefined;
        this.lastKnownAction = undefined;
        this.lastAppliedAction = undefined;
    }

    /**
     * Handles an transactional action internally.
     * Either delays the action, or applies it.
     * If it is applied, either an incremental update is calculated or a text document modification is created.
     *
     * @param action the action to handle
     * @returns the computed result of the action
     */
    private createHandleActionResult(action: TransactionalAction): IncrementalUpdate[] {
        const currentDiagram = this.diagram.currentDiagram;
        if (currentDiagram != undefined && this.edit != undefined) {
            return this.edit.predictActionDiff(this.diagram.currentDiagram!, this.lastKnownAction, action);
        } else {
            return [];
        }
    }

    /**
     * Updates a LayoutedDiagram based on the lastKnownAction.
     * Also triggers any outstanding actions.
     *
     * @param layoutedDiagram the layouted diagram
     */
    updateLayoutedDiagram(layoutedDiagram: BaseLayoutedDiagram): void {
        if (this.lastKnownAction != undefined && this.lastAppliedAction != undefined && this.edit != undefined) {
            if (this.lastKnownAction != this.lastAppliedAction) {
                this.edit.predictActionDiff(layoutedDiagram, this.lastAppliedAction, this.lastKnownAction);
            }
        }
        this.hasUpdatedDiagram = true;
        this.updateTextDocumentIfPossible();
    }

    /**
     * Update the current entries based on the changes.
     * Updates indices.
     *
     * @param changes the changes to the text document
     */
    updateGeneratorEntries(changes: TextDocumentContentChangeEvent[]): void {
        if (this.edit != undefined) {
            this.edit.updateEngines(changes);
        }
    }
}
