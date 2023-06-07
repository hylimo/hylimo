import { BaseLayoutedDiagram } from "@hylimo/diagram";
import { IncrementalUpdate, TransactionalAction } from "@hylimo/diagram-protocol";
import { TextDocumentContentChangeEvent } from "vscode-languageserver-textdocument";
import { Diagram } from "../diagram/diagram";
import { TransactionalEdit, TransactionalEditEngine, Versioned } from "./edits/transactionalEdit";
import { TransactionalEditRegistory } from "./edits/transactionalEditRegistry";
import { SharedDiagramUtils } from "../sharedDiagramUtils";

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
    private edit?: Versioned<TransactionalEdit>;
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
        private readonly registry: TransactionalEditRegistory,
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
        const engine = this.registry.getEditEngine(action.kind);
        const transformedAction = engine.transformAction(action, this.utils.config);
        if (this.currentTransactionId != undefined && this.currentTransactionId != transformedAction.transactionId) {
            // eslint-disable-next-line no-console
            console.error("Concurrent transactions are not supported yet");
            this.resetActionState();
        }
        if (this.currentTransactionId == transformedAction.transactionId && this.edit == undefined) {
            return [];
        }
        this.currentTransactionId = transformedAction.transactionId;
        if (this.edit == undefined) {
            this.edit = {
                ...(await this.diagram.generateTransactionalEdit(transformedAction)),
                version: this.diagram.document.version
            };
        }
        const result = this.createHandleActionResult(transformedAction, engine);
        this.lastKnownAction = transformedAction;
        this.updateTextDocumentIfPossible();
        return result;
    }

    /**
     * Updates the text document if possible, meaning if the last known action has not been applied yet.
     */
    private updateTextDocumentIfPossible(): void {
        if (
            this.edit != undefined &&
            this.lastKnownAction != undefined &&
            this.lastKnownAction != this.lastAppliedAction &&
            this.hasUpdatedDiagram
        ) {
            this.hasUpdatedDiagram = false;
            const engine = this.registry.getEditEngine(this.lastKnownAction.kind);
            const textDocumentEdit = engine.applyAction(this.edit, this.lastKnownAction, this.diagram.document);
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
     * @param engine engine which handles the edit
     * @returns the computed result of the action
     */
    private createHandleActionResult(
        action: TransactionalAction,
        engine: TransactionalEditEngine<any, any>
    ): IncrementalUpdate[] {
        const currentDiagram = this.diagram.currentDiagram;
        if (currentDiagram != undefined) {
            return engine.predictActionDiff(this.edit, this.diagram.currentDiagram!, this.lastKnownAction, action);
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
                const engine = this.registry.getEditEngine(this.lastKnownAction.kind);
                engine.predictActionDiff(this.edit, layoutedDiagram, this.lastAppliedAction, this.lastKnownAction);
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
            TransactionalEdit.updateGeneratorEntries(this.edit, changes, this.diagram.document);
        }
    }
}
