import { DiagramLayoutResult } from "@hylimo/diagram";
import { IncrementalUpdate, TransactionalAction } from "@hylimo/diagram-common";
import { TextDocumentEdit } from "vscode-languageserver";
import { TextDocumentContentChangeEvent } from "vscode-languageserver-textdocument";
import { Diagram } from "../diagram";
import { TransactionalEdit, TransactionalEditEngine, Versioned } from "./edits/transactionalEdit";
import { TransactionalEditRegistory } from "./edits/transactionalEditRegistry";

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
     * The last version on which an action was applied.
     * The next action can only be applied if the version of the diagram is greater than this value.
     */
    private lastVersion = -1;
    /**
     * Should be invoked to handle a delayed action
     */
    private delayedHandleAction?: () => unknown;

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
     */
    constructor(private readonly diagram: Diagram, private readonly registry: TransactionalEditRegistory) {}

    /**
     * Handles an action. Does currently not support concurrent/interleaved transactions
     *
     * @param action the action to handle
     * @returns the created TextDocumentEdit
     */
    async handleAction(action: TransactionalAction): Promise<HandleActionResult> {
        if (this.currentTransactionId != undefined && this.currentTransactionId != action.transactionId) {
            throw new Error("Concurrent transactions are currently not supported");
        }
        this.currentTransactionId = action.transactionId;
        if (this.edit == undefined) {
            this.edit = {
                ...(await this.diagram.layoutedDiagram.generateTransactionalEdit(action)),
                version: this.diagram.document.version
            };
        }
        const engine = this.registry.getEditEngine(this.edit);
        const result = await this.createHandleActionResult(action, engine);
        this.lastKnownAction = action;
        if (action.commited) {
            this.currentTransactionId = undefined;
            this.edit = undefined;
            this.lastKnownAction = undefined;
            this.lastAppliedAction = undefined;
            this.delayedHandleAction = undefined;
        }
        return result;
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
    private async createHandleActionResult(action: TransactionalAction, engine: TransactionalEditEngine<any, any>) {
        let result: HandleActionResult;
        if (this.lastVersion == this.diagram.version) {
            if (action.commited) {
                this.delayedHandleAction = () => this.handleAction(action);
                result = await new Promise((resolve) => {
                    this.delayedHandleAction = () => {
                        this.delayedHandleAction = undefined;
                        resolve(this.handleAction(action));
                    };
                });
            } else {
                const currentDiagram = this.diagram.currentDiagram;
                if (currentDiagram != undefined) {
                    engine.predictActionDiff(this.edit, this.diagram.currentDiagram!, this.lastKnownAction, action);
                }
                result = {};
            }
        } else {
            this.lastVersion = this.diagram.version;
            this.lastAppliedAction = action;
            result = {
                textDocumentEdit: engine.applyAction(this.edit, action, this.diagram.document)
            };
        }
        return result;
    }

    /**
     * Updates a LayoutedDiagram based on the lastKnownAction.
     * Also triggers any outstanding actions.
     *
     * @param layoutedDiagram the layouted diagram
     */
    updateLayoutedDiagram(layoutedDiagram: DiagramLayoutResult): void {
        if (this.lastKnownAction != undefined && this.lastAppliedAction != undefined && this.edit != undefined) {
            if (this.lastKnownAction != this.lastAppliedAction) {
                const engine = this.registry.getEditEngine(this.edit!);
                engine.predictActionDiff(this.edit, layoutedDiagram, this.lastAppliedAction, this.lastKnownAction);
            }
        }
        if (this.delayedHandleAction) {
            this.delayedHandleAction();
        }
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

/**
 * Result of handleAction
 */
interface HandleActionResult {
    /**
     * Updation text document edit
     */
    textDocumentEdit?: TextDocumentEdit;
    /**
     * Optional incremental updates
     */
    incrementalUpdates?: IncrementalUpdate[];
}
