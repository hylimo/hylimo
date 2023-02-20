import { FullObject, Expression, InterpretationResult, CstResult } from "@hylimo/core";
import { DiagramLayoutResult } from "@hylimo/diagram";
import { TransactionalAction, TranslationMoveAction, RotationAction, LineMoveAction } from "@hylimo/diagram-common";
import { Diagnostic, DiagnosticSeverity, uinteger, Range } from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { LineMoveEdit } from "../edit/edits/lineMoveEdit";
import { RotationEdit } from "../edit/edits/rotationEdit";
import { TransactionalEdit } from "../edit/edits/transactionalEdit";
import { TranslationMoveEdit } from "../edit/edits/translationMoveEdit";
import { LayoutedDiagramImplementation, DiagramUpdateResult } from "../layoutedDiagram";
import { SharedDiagramUtils } from "../sharedDiagramUtils";

/**
 * Local implementation of a layouted diagram.
 */
export class LocalLayoutedDiagram extends LayoutedDiagramImplementation {
    /**
     * Result of the last call to updateDiagram
     */
    private layoutResult?: DiagramLayoutResult;
    /**
     * Parsed version of the source provided to updateDiagram
     */
    private document?: TextDocument;

    /**
     * Creates a new local layouted diagram
     *
     * @param utils required for parsing, interpreting and layouting of the diagram
     */
    constructor(private readonly utils: SharedDiagramUtils) {
        super();
    }

    override async updateDiagram(source: string): Promise<DiagramUpdateResult> {
        this.document = TextDocument.create("", "sys", 0, source);
        const parserResult = this.utils.parser.parse(source);
        const diagnostics: Diagnostic[] = [];
        diagnostics.push(...this.getParserResultDiagnostics(parserResult));
        if (parserResult.ast) {
            const interpretationResult = this.runInterpreterAndConvertErrors(parserResult.ast, diagnostics);
            if (interpretationResult.result) {
                this.layoutResult = await this.utils.layoutEngine.layout(interpretationResult.result as FullObject);
                return {
                    diagnostics,
                    diagram: this.layoutResult
                };
            }
        }
        return {
            diagnostics
        };
    }

    override async generateTransactionalEdit(action: TransactionalAction): Promise<TransactionalEdit> {
        if (this.layoutResult == undefined) {
            throw new Error("Diagram not yet initialized");
        }

        if (TranslationMoveAction.is(action)) {
            return TranslationMoveEdit.create(action, this.layoutResult, this.document!);
        } else if (RotationAction.is(action)) {
            return RotationEdit.create(action, this.layoutResult, this.document!);
        } else if (LineMoveAction.is(action)) {
            return LineMoveEdit.create(action, this.layoutResult);
        } else {
            throw new Error("Unknown action type");
        }
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
     * @param parserResult the parsing result
     * @returns the found diagnostics
     */
    private getParserResultDiagnostics(parserResult: CstResult): Diagnostic[] {
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
                location = Range.create(uinteger.MAX_VALUE, uinteger.MAX_VALUE, uinteger.MAX_VALUE, uinteger.MAX_VALUE);
            }
            diagnostics.push(
                Diagnostic.create(location, error.message || "unknown syntax error", DiagnosticSeverity.Error)
            );
        });
        return diagnostics;
    }
}
