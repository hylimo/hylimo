import { TextDocument, TextDocumentContentChangeEvent } from "vscode-languageserver-textdocument";
import { SharedDiagramUtils } from "../sharedDiagramUtils";
import { CompletionItem, Diagnostic, Position, TextDocumentEdit } from "vscode-languageserver";
import { TransactionManager } from "../edit/transactionManager";
import {
    NavigateToSourceAction,
    PublishDocumentRevealNotification,
    TransactionalAction
} from "@hylimo/diagram-protocol";
import { DiagramImplementation } from "./diagramImplementation";
import { BaseLayoutedDiagram } from "@hylimo/diagram";
import { defaultEditRegistry } from "../edit/edits/transactionalEditRegistry";
import { DiagramImplementationManager } from "./diagramImplementationManager";
import { TransactionalEdit } from "../edit/edits/transactionalEdit";

/**
 * Holds the state for a specific diagram
 */
export class Diagram {
    /**
     * The current diagram
     */
    currentDiagram?: BaseLayoutedDiagram;
    /**
     * Handles TransactionActions
     */
    private transactionManager = new TransactionManager(this, defaultEditRegistry, this.utils);

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
        const diagnostics: Diagnostic[] = await this.updateDiagram();
        this.utils.connection.sendDiagnostics({
            uri: this.document.uri,
            diagnostics: diagnostics
        });
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
     * @returns diagnostic entries containing errors
     */
    private async updateDiagram(): Promise<Diagnostic[]> {
        this.implementation = this.implementationManager.getNewDiagramImplementation(
            this.document.uri,
            this.implementation
        );
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
     * Generates a transactional edit for the given transactional action.
     * Throws an error if updateDiagram has not been called yet.
     *
     * @param action the action to generate the edit for
     * @returns the generated transactional edit
     */
    async generateTransactionalEdit(action: TransactionalAction): Promise<TransactionalEdit> {
        if (this.implementation == undefined) {
            throw new Error("Cannot generate transactional edit without implementation");
        }
        return this.implementation.generateTransactionalEdit(action);
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
