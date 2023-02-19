import { TextDocument, TextDocumentContentChangeEvent } from "vscode-languageserver-textdocument";
import { SharedDiagramUtils } from "./sharedDiagramUtils";
import { Diagnostic } from "vscode-languageserver";
import { TransactionManager } from "./edit/transactionManager";
import { TransactionalAction } from "@hylimo/diagram-common";
import { LayoutedDiagram, LocalLayoutedDiagram } from "./layoutedDiagram";
import { DiagramLayoutResult } from "@hylimo/diagram";
import { defaultEditRegistry } from "./edit/edits/transactionalEditRegistry";

/**
 * Holds the state for a specific diagram
 */
export class Diagram {
    /**
     * The layouted diagram
     */
    layoutedDiagram: LayoutedDiagram;
    /**
     * The current diagram
     */
    currentDiagram?: DiagramLayoutResult;
    /**
     * Handles TransactionActions
     */
    private transactionManager = new TransactionManager(this, defaultEditRegistry);

    /**
     * A counter which increases on every change to the document (after layouting)
     */
    version = 0;

    /**
     * Creates a new diagram
     *
     * @param document the document on which it is based
     * @param utils shared diagram utils
     */
    constructor(readonly document: TextDocument, readonly utils: SharedDiagramUtils) {
        //TODO fix
        this.layoutedDiagram = new LocalLayoutedDiagram(utils);
    }

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
     * Updates the current transaction based on changes to the document.
     * Should update indices to correspond to the new file.
     *
     * @param changes changes applied to the document
     */
    updateCurrentTransaction(changes: TextDocumentContentChangeEvent[]): void {
        this.transactionManager.updateGeneratorEntries(changes);
    }

    /**
     * Updates the Diagram based on an updated document
     *
     * @returns diagnostic entries containing errors
     */
    private async updateDiagram(): Promise<Diagnostic[]> {
        const result = await this.layoutedDiagram.updateDiagram(this.document.getText());
        this.version++;
        const diagram = result.diagram;
        this.currentDiagram = diagram;
        if (diagram != undefined) {
            this.transactionManager.updateLayoutedDiagram(diagram);
            this.updateDiagramOnServerManager();
        }
        return result.diagnostics;
    }

    /**
     * Handles a transactional action
     *
     * @param action the action to handle
     */
    async handleTransactionalAction(action: TransactionalAction): Promise<void> {
        const edit = await this.transactionManager.handleAction(action);
        this.updateDiagramOnServerManager();
        if (edit != undefined) {
            this.utils.connection.workspace.applyEdit({
                documentChanges: [edit]
            });
        }
    }

    /**
     * Updates the diag
     */
    private updateDiagramOnServerManager(): void {
        if (this.currentDiagram != undefined) {
            this.currentDiagram.rootElement.noAnimation = this.transactionManager.isActive;
            this.utils.diagramServerManager.updatedDiagram(this);
        }
    }
}
