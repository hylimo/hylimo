import type { TextDocumentContentChangeEvent } from "vscode-languageserver-textdocument";
import { TextDocument } from "vscode-languageserver-textdocument";
import type { SharedDiagramUtils } from "../sharedDiagramUtils.js";
import {
    DiagnosticSeverity,
    type CompletionItem,
    type Diagnostic,
    type Position,
    type TextDocumentEdit
} from "vscode-languageserver";
import { TransactionManager } from "../edit/transactionManager.js";
import type {
    NavigateToSourceAction,
    UpdateEditorConfigAction,
    ToolboxEditPredictionRequestAction
} from "@hylimo/diagram-protocol";
import {
    DiagramErrorAction,
    UpdateEditorConfigNotification,
    PublishDocumentRevealNotification,
    TransactionalAction,
    ToolboxEditPredictionResponseAction
} from "@hylimo/diagram-protocol";
import type { DiagramImplementation } from "./diagramImplementation.js";
import { BaseLayoutedDiagram } from "@hylimo/diagram-common";
import type { DiagramImplementationManager } from "./diagramImplementationManager.js";
import { TransactionalEdit } from "../edit/edit/transactionalEdit.js";

/**
 * Holds the state for a specific diagram
 */
export class Diagram {
    /**
     * The current diagram
     */
    currentDiagram?: BaseLayoutedDiagram;
    /**
     * Update counter to ensure older updates do not overwrite newer ones
     */
    private updateCounter = 0;
    /**
     * The last applied update
     */
    private currentUpdate = -1;
    /**
     * Handles TransactionActions
     */
    private transactionManager = new TransactionManager(this, this.utils);

    /**
     * The implementation to which all requests are delegated
     */
    private implementation?: DiagramImplementation;

    /**
     * Creates a new diagram
     *
     * @param document the document on which it is based
     * @param utils shared diagram utils
     * @param implementationManager the layouted diagram manager provided to the LayoutedDiagram
     */
    constructor(
        readonly document: TextDocument,
        private readonly utils: SharedDiagramUtils,
        private readonly implementationManager: DiagramImplementationManager
    ) {}

    /**
     * Called when the content of the associated document changes
     */
    async onDidChangeContent(): Promise<void> {
        const diagnostics = await this.updateDiagram();
        if (diagnostics != undefined) {
            this.utils.connection.sendDiagnostics({
                uri: this.document.uri,
                diagnostics: diagnostics
            });
            const errorDiagnostics = diagnostics.filter(
                (diagnostic) => diagnostic.severity === DiagnosticSeverity.Error
            );
            if (errorDiagnostics.length > 0) {
                const errorAction: DiagramErrorAction = {
                    kind: DiagramErrorAction.KIND,
                    diagnostics: errorDiagnostics
                };
                this.utils.diagramServerManager.sendErrorToDiagram(this.document.uri, errorAction);
            }
        }
    }

    /**
     * Called to update the diagram based on a config change
     */
    async onDidChangeConfig(): Promise<void> {
        return this.onDidChangeContent();
    }

    /**
     * Updates the current transaction based on changes to the document.
     * Should update indices to correspond to the new file.
     *
     * @param changes changes applied to the document
     */
    updateCurrentTransaction(changes: TextDocumentContentChangeEvent[]): void {
        this.transactionManager.updateGeneratorEntries(changes);
    }

    /**
     * Updates the Diagram based on an updated document or config change
     *
     * @returns diagnostic entries containing errors, undefined if update is outdated (newer update has already been applied)
     */
    private async updateDiagram(): Promise<Diagnostic[] | undefined> {
        this.implementation = this.implementationManager.getNewDiagramImplementation(
            this.document.uri,
            this.implementation
        );
        const currentUpdateCounter = this.updateCounter++;
        const result = await this.implementation.updateDiagram(
            this.document.getText(),
            this.utils.config.diagramConfig
        );
        let diagram: BaseLayoutedDiagram | undefined;
        if (result.rootElement != undefined) {
            diagram = BaseLayoutedDiagram.fromRoot(result.rootElement);
        } else {
            diagram = undefined;
        }
        if (currentUpdateCounter < this.currentUpdate) {
            return undefined;
        }
        this.currentUpdate = currentUpdateCounter;
        this.currentDiagram = diagram;
        if (diagram != undefined) {
            this.transactionManager.updateLayoutedDiagram(diagram);
            const root = diagram.rootElement;
            this.utils.diagramServerManager.updatedDiagram(this.document.uri, root);
        }
        return result.diagnostics;
    }

    /**
     * Handles a transactional action
     *
     * @param action the action to handle
     */
    async handleTransactionalAction(action: TransactionalAction): Promise<void> {
        const incrementalUpdates = await this.transactionManager.handleAction(action);
        this.utils.diagramServerManager.incrementalUpdateDiagram(
            this.document.uri,
            incrementalUpdates,
            action.sequenceNumber
        );
    }

    /**
     * Handles a navigate to source action
     *
     * @param action the action to handle
     */
    async handleNavigateToSourceAction(action: NavigateToSourceAction): Promise<void> {
        if (this.implementation == undefined) {
            throw new Error("Cannot generate transactional edit without implementation");
        }
        const range = await this.implementation.getSourceRange(action.element);
        if (range != undefined) {
            await this.utils.connection.sendNotification(PublishDocumentRevealNotification.type, {
                uri: this.document.uri,
                range
            });
        }
    }

    /**
     * Handles a editor config update action
     * Forwards the config to the language client
     *
     * @param action the action to handle
     */
    async handleUpdateEditorConfigAction(action: UpdateEditorConfigAction): Promise<void> {
        return this.utils.connection.sendNotification(UpdateEditorConfigNotification.type, action.config);
    }

    /**
     * Handles a toolbox edit prediction request action
     *
     * @param action the action to handle
     * @returns the response action
     */
    async handleToolboxEditPredictionRequestAction(
        action: ToolboxEditPredictionRequestAction
    ): Promise<ToolboxEditPredictionResponseAction> {
        const transactionalAction: TransactionalAction = {
            kind: TransactionalAction.KIND,
            transactionId: "",
            sequenceNumber: 0,
            committed: false,
            edits: [action.edit]
        };
        const edit = new TransactionalEdit(transactionalAction, this, this.utils.editHandlerRegistry);
        const textDocumentEdit = await edit.applyAction(transactionalAction);
        const updatedDiagram = TextDocument.applyEdits(this.document, textDocumentEdit.edits);
        const implementation = this.implementationManager.getNewDiagramImplementation(this.document.uri);
        const root = await implementation.renderPredictionDiagram(updatedDiagram, this.utils.config.diagramConfig);
        return {
            kind: ToolboxEditPredictionResponseAction.KIND,
            root,
            responseId: action.requestId
        };
    }

    /**
     * Applies an edit to the document
     *
     * @param edit the edit to apply
     */
    async applyEdit(edit: TextDocumentEdit): Promise<void> {
        this.utils.connection.workspace.applyEdit({
            documentChanges: [edit]
        });
    }

    /**
     * Generates completion items for the given position.
     *
     * @param position the position to generate the completion items for
     * @returns the generated completion items
     */
    async generateCompletionItems(position: Position): Promise<CompletionItem[] | undefined> {
        const implementation = this.implementationManager.getNewDiagramImplementation(this.document.uri);
        return implementation.generateCompletionItems(
            this.document.getText(),
            this.utils.config.diagramConfig,
            position
        );
    }
}
