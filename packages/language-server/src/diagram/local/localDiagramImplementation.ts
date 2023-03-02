import { Expression, InterpretationResult, CstResult, toExecutable, AutocompletionItemKind } from "@hylimo/core";
import { DiagramLayoutResult } from "@hylimo/diagram";
import {
    TransactionalAction,
    TranslationMoveAction,
    RotationAction,
    LineMoveAction,
    ResizeAction,
    AxisAlignedSegmentEditAction
} from "@hylimo/diagram-common";
import {
    Diagnostic,
    DiagnosticSeverity,
    uinteger,
    Range,
    CompletionItem,
    Position,
    TextEdit,
    MarkupContent,
    CompletionItemKind
} from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { AxisAlignedSegmentEdit } from "../../edit/edits/axisAlignedSegmentEdit";
import { LineMoveEdit } from "../../edit/edits/lineMoveEdit";
import { ResizeEdit } from "../../edit/edits/resizeEdit";
import { RotationEdit } from "../../edit/edits/rotationEdit";
import { TransactionalEdit } from "../../edit/edits/transactionalEdit";
import { TranslationMoveEdit } from "../../edit/edits/translationMoveEdit";
import { DiagramImplementation, DiagramUpdateResult } from "../diagramImplementation";
import { SharedDiagramUtils } from "../../sharedDiagramUtils";

/**
 * Local implementation of a diagram.
 */
export class LocalDiagramImplementation extends DiagramImplementation {
    /**
     * Result of the last call to updateDiagram
     */
    private layoutResult?: DiagramLayoutResult;
    /**
     * Parsed version of the source provided to updateDiagram
     */
    private document?: TextDocument;

    /**
     * Creates a new LocalDiagramImplementation
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
                try {
                    this.layoutResult = await this.utils.layoutEngine.layout(interpretationResult.result);
                    return {
                        diagnostics,
                        diagram: this.layoutResult
                    };
                } catch (error: any) {
                    diagnostics.push({
                        severity: DiagnosticSeverity.Error,
                        range: Range.create(0, 0, uinteger.MAX_VALUE, uinteger.MAX_VALUE),
                        message: `Error during layouting: ${error.message}`
                    });
                }
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
        } else if (ResizeAction.is(action)) {
            return ResizeEdit.create(action, this.layoutResult, this.document!);
        } else if (AxisAlignedSegmentEditAction.is(action)) {
            return AxisAlignedSegmentEdit.create(action, this.layoutResult);
        } else {
            throw new Error("Unknown action type");
        }
    }

    override async generateCompletionItems(position: Position): Promise<CompletionItem[] | undefined> {
        const items = this.utils.autocompletionEngine.autocomplete(
            this.document!.getText(),
            this.document!.offsetAt(position)
        );
        if (items == undefined) {
            return undefined;
        }
        return items.map((item) => {
            const range = item.replaceRange;
            return {
                label: item.label,
                detail: item.label,
                documentation: this.preprocessDocumentation(item.documentation),
                textEdit: TextEdit.replace(
                    Range.create(
                        Position.create(range.startLine, range.startColumn),
                        Position.create(range.endLine, range.endColumn)
                    ),
                    item.value
                ),
                kind: this.convertCompletionKind(item.kind)
            };
        });
    }

    /**
     * Preprocesses the documentation string to make it more readable in the editor
     *
     * @param documentation the syncscript documentation string, may be undefined
     * @returns the processed documentation string
     */
    private preprocessDocumentation(documentation: string | undefined): MarkupContent | undefined {
        if (documentation == undefined) {
            return undefined;
        }
        const lines = documentation.split("\n").filter((line) => line.trim() != "");
        const indentation = lines
            .map((line) => line.match(/^\s*/)?.[0]?.length ?? 0)
            .reduce((a, b) => Math.min(a, b), Number.MAX_SAFE_INTEGER);
        const unendentedLines = lines.map((line) => line.substring(indentation));
        const processedLines = unendentedLines
            .map((line) => {
                const whitespaceLength = line.match(/^\s*/)?.[0]?.length ?? 0;
                const half = Math.floor(whitespaceLength / 2);
                return line.substring(half);
            })
            .map((line) => {
                if (line.trim() == "Params:") {
                    return "\n**Params:**";
                } else if (line.trim() == "Returns:") {
                    return "\n**Returns:**\n";
                } else {
                    return line;
                }
            });
        const processed = processedLines.join("\n");
        return {
            kind: "markdown",
            value: processed
        };
    }

    /**
     * Converts a syncscript autocompletion item kind to a lsp completion item kind
     *
     * @param kind the syncscript autocompletion item kind to convert
     * @returns the converted lsp completion item kind
     */
    private convertCompletionKind(kind: AutocompletionItemKind): CompletionItemKind {
        switch (kind) {
            case AutocompletionItemKind.METHOD:
                return CompletionItemKind.Method;
            case AutocompletionItemKind.FUNCTION:
                return CompletionItemKind.Function;
            case AutocompletionItemKind.VARIABLE:
                return CompletionItemKind.Variable;
            case AutocompletionItemKind.FIELD:
                return CompletionItemKind.Field;
            default:
                return CompletionItemKind.Text;
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
        const interpretationResult = this.utils.interpreter.run(toExecutable(expressions));
        const error = interpretationResult.error;
        if (error) {
            const pos = error.findFirstPosition();
            if (pos) {
                diagnostics.push(
                    Diagnostic.create(
                        Range.create(pos.startLine, pos.startColumn, pos.endLine, pos.endColumn),
                        error.message || "[no message provided]",
                        DiagnosticSeverity.Error
                    )
                );
            }
            /* eslint-disable no-console */
            console.error(error);
            console.error(error.interpretationStack);
            /* eslint-enable no-console */
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
                    Range.create(error.line!, error.column!, error.line!, error.column! + error.length),
                    error.message || "unknown lexical error",
                    DiagnosticSeverity.Error
                )
            );
        });
        parserResult.parserErrors.forEach((error) => {
            const pos = error.position;
            let location: Range;
            if (!Number.isNaN(error.token.startLine)) {
                location = Range.create(pos.startLine!, pos.startColumn!, pos.endLine!, pos.endColumn!);
            } else {
                location = Range.create(0, 0, uinteger.MAX_VALUE, uinteger.MAX_VALUE);
            }
            diagnostics.push(
                Diagnostic.create(location, error.message || "unknown syntax error", DiagnosticSeverity.Error)
            );
        });
        return diagnostics;
    }
}
