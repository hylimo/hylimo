import { TextDocument, TextDocumentContentChangeEvent } from "vscode-languageserver-textdocument";
import { CstResult, Expression, FullObject, InterpretationResult } from "@hylimo/core";
import { LayoutedDiagram } from "@hylimo/diagram";
import { SharedDiagramUtils } from "./sharedDiagramUtils";
import { Diagnostic, DiagnosticSeverity, Range, uinteger } from "vscode-languageserver";
import { TransactionManager } from "./edit/transactionManager";
import { TransactionalAction } from "@hylimo/diagram-common";

/**
 * Holds the state for a specific diagram
 */
export class Diagram {
    /**
     * The last parsing result
     */
    lastParserResult?: CstResult;
    /**
     * The layouted diagram
     */
    layoutedDiagram?: LayoutedDiagram;
    /**
     * Handles TransactionActions
     */
    private transactionManager = new TransactionManager(this);
    /**
     * Marker that the model has been updated
     */
    private hasUpdatedModel = true;
    /**
     * Action which was commited, but has not been executed yet
     */
    private delayedCommitedAction?: TransactionalAction;

    /**
     * Creates a new diagram
     *
     * @param document the document on which it is based
     * @param utils shared diagram utils
     */
    constructor(readonly document: TextDocument, readonly utils: SharedDiagramUtils) {}

    /**
     * Called when the content of the associated document changes
     */
    async onDidChangeContent(): Promise<void> {
        const diagnostics: Diagnostic[] = await this.updateDiagram();
        this.hasUpdatedModel = true;
        if (this.delayedCommitedAction != undefined) {
            await this.handleTransactionalAction(this.delayedCommitedAction);
            this.delayedCommitedAction = undefined;
        }
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
        const parserResult = this.utils.parser.parse(this.document.getText());
        this.lastParserResult = parserResult;
        const diagnostics: Diagnostic[] = [];
        diagnostics.push(...this.getParserResultDiagnostics(this.document, parserResult));
        if (parserResult.ast) {
            const interpretationResult = this.runInterpreterAndConvertErrors(parserResult.ast, diagnostics);
            if (interpretationResult.result) {
                const layoutedDiagram = await this.utils.layoutEngine.layout(interpretationResult.result as FullObject);
                this.transactionManager.updateLayoutedDiagram(layoutedDiagram);
                this.layoutedDiagram = layoutedDiagram;
                this.utils.diagramServerManager.updatedDiagram(this);
            }
        }
        return diagnostics;
    }

    /**
     * Runs the interpreter on the parserResult
     *
     * @param expressions the expressions to execute
     * @param diagnostics the diagnostics array where to push a potential error
     * @returns the result of the interpreter run
     */
    private runInterpreterAndConvertErrors(expressions: Expression[], diagnostics: Diagnostic[]): InterpretationResult {
        const interpretationResult = this.utils.interpreter.run(expressions, this.utils.maxExecutionSteps);
        const error = interpretationResult.error;
        if (error) {
            const pos = error.findFirstPosition();
            if (pos) {
                diagnostics.push(
                    Diagnostic.create(
                        Range.create(pos.startLine - 1, pos.startColumn - 1, pos.endLine - 1, pos.endColumn),
                        error.message || "[no message provided]",
                        DiagnosticSeverity.Error
                    )
                );
            }
            console.error(error);
            console.error(error.interpretationStack);
            //TODO do sth else with error
        }
        return interpretationResult;
    }

    /**
     * Creates diagnostics from lexical and parsing errors
     *
     * @param document the document which was parsed
     * @param parserResult the parsing result
     * @returns the found diagnostics
     */
    private getParserResultDiagnostics(document: TextDocument, parserResult: CstResult): Diagnostic[] {
        const diagnostics: Diagnostic[] = [];
        parserResult.lexingErrors.forEach((error) => {
            diagnostics.push(
                Diagnostic.create(
                    Range.create(error.line! - 1, error.column! - 1, error.line! - 1, error.column! + error.length),
                    error.message || "unknown lexical error",
                    DiagnosticSeverity.Error
                )
            );
        });
        parserResult.parserErrors.forEach((error) => {
            const token = error.token;
            let location: Range;
            if (!Number.isNaN(error.token.startLine)) {
                location = Range.create(
                    token.startLine! - 1,
                    token.startColumn! - 1,
                    token.endLine! - 1,
                    token.endColumn!
                );
            } else {
                location = Range.create(document.lineCount, uinteger.MAX_VALUE, document.lineCount, uinteger.MAX_VALUE);
            }
            diagnostics.push(
                Diagnostic.create(location, error.message || "unknown syntax error", DiagnosticSeverity.Error)
            );
        });
        return diagnostics;
    }

    /**
     * Handles a transactional action
     *
     * @param action the action to handle
     */
    async handleTransactionalAction(action: TransactionalAction): Promise<void> {
        this.transactionManager.setNewestAction(action);
        if (!this.hasUpdatedModel) {
            if (action.commited) {
                this.delayedCommitedAction = action;
            }
            return;
        }
        this.hasUpdatedModel = false;
        const edit = this.transactionManager.handleAction(action);
        await this.utils.connection.workspace.applyEdit({
            documentChanges: [edit]
        });
    }
}
