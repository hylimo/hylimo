import { TextDocument } from "vscode-languageserver-textdocument";
import { CstResult, FullObject } from "@hylimo/core";
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
        const parserResult = this.utils.parser.parse(this.document.getText());
        this.lastParserResult = parserResult;
        const diagnostics: Diagnostic[] = [];
        diagnostics.push(...this.getParserResultDiagnostics(this.document, parserResult));
        if (parserResult.ast) {
            const interpretationResult = this.utils.interpreter.run(parserResult.ast, this.utils.maxExecutionSteps);
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
            if (interpretationResult.result) {
                const layoutedDiagram = await this.utils.layoutEngine.layout(interpretationResult.result as FullObject);
                this.layoutedDiagram = layoutedDiagram;
                this.utils.diagramServerManager.updatedDiagram(this);
            }
        }
        this.hasUpdatedModel = true;
        this.utils.connection.sendDiagnostics({
            uri: this.document.uri,
            diagnostics: diagnostics
        });
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
        if (!this.hasUpdatedModel && !action.commited) {
            return;
        }
        this.hasUpdatedModel = false;
        const edit = this.transactionManager.handleAction(action);
        await this.utils.connection.workspace.applyEdit({
            documentChanges: [edit]
        });
    }
}
