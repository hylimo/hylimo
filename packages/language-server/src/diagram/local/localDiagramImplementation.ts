import { LayoutedDiagram, RenderErrors } from "@hylimo/diagram";
import {
    TransactionalAction,
    TranslationMoveAction,
    RotationAction,
    LineMoveAction,
    ResizeAction,
    AxisAlignedSegmentEditAction
} from "@hylimo/diagram-protocol";
import { Diagnostic, DiagnosticSeverity, uinteger, Range, CompletionItem, Position } from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { AxisAlignedSegmentEdit } from "../../edit/edits/axisAlignedSegmentEdit";
import { LineMoveEdit } from "../../edit/edits/lineMoveEdit";
import { ResizeEdit } from "../../edit/edits/resizeEdit";
import { RotationEdit } from "../../edit/edits/rotationEdit";
import { TransactionalEdit } from "../../edit/edits/transactionalEdit";
import { TranslationMoveEdit } from "../../edit/edits/translationMoveEdit";
import { DiagramImplementation, DiagramUpdateResult } from "../diagramImplementation";
import { SharedDiagramUtils } from "../../sharedDiagramUtils";
import { DiagramConfig } from "@hylimo/diagram-common";

/**
 * Local implementation of a diagram.
 */
export class LocalDiagramImplementation extends DiagramImplementation {
    /**
     * Result of the last call to updateDiagram
     */
    private layoutResult?: LayoutedDiagram;
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

    override async updateDiagram(source: string, config: DiagramConfig): Promise<DiagramUpdateResult> {
        this.document = TextDocument.create("", "sys", 0, source);
        const renderResult = await this.utils.diagramEngine.render(source, config);
        this.layoutResult = renderResult.layoutedDiagram;
        const diagnostics: Diagnostic[] = [];
        const errors = renderResult.errors;
        diagnostics.push(...errors.lexingErrors.map(this.convertLexerError.bind(this)));
        diagnostics.push(...errors.parserErrors.map(this.convertParserError.bind(this)));
        diagnostics.push(...errors.interpreterErrors.map(this.convertInterpretationError.bind(this)));
        diagnostics.push(...errors.layoutErrors.map(this.convertLayoutError.bind(this)));
        return {
            diagnostics,
            rootElement: renderResult.layoutedDiagram?.rootElement
        };
    }

    /**
     * Converts a lexer error to a diagnostic item
     *
     * @param error the lexer error to convert
     * @returns the created diagnostic item
     */
    private convertLexerError(error: RenderErrors["lexingErrors"][0]): Diagnostic {
        return Diagnostic.create(
            Range.create(error.line!, error.column!, error.line!, error.column! + error.length),
            error.message || "unknown lexical error",
            DiagnosticSeverity.Error
        );
    }

    /**
     * Converts a parser error to a diagnostic item
     *
     * @param error the parser error to convert
     * @returns the created diagnostic item
     */
    private convertParserError(error: RenderErrors["parserErrors"][0]) {
        const pos = error.position;
        let location: Range;
        if (!Number.isNaN(error.token.startLine)) {
            location = Range.create(pos.startLine, pos.startColumn, pos.endLine, pos.endColumn);
        } else {
            location = Range.create(0, 0, uinteger.MAX_VALUE, uinteger.MAX_VALUE);
        }
        return Diagnostic.create(location, error.message || "unknown syntax error", DiagnosticSeverity.Error);
    }

    /**
     * Converts an interpretation error to a diagnostic item
     *
     * @param error the interpretation error to convert
     * @returns the created diagnostic item
     */
    private convertInterpretationError(error: RenderErrors["interpreterErrors"][0]): Diagnostic {
        /* eslint-disable no-console */
        console.error(error);
        console.error(error.interpretationStack);
        /* eslint-enable no-console */
        //TODO do sth else with error
        const pos = error.findFirstPosition();
        const message = error.message || "[no message provided]";
        if (pos != undefined) {
            return Diagnostic.create(
                Range.create(pos.startLine, pos.startColumn, pos.endLine, pos.endColumn),
                message,
                DiagnosticSeverity.Error
            );
        } else {
            return Diagnostic.create(
                Range.create(0, 0, uinteger.MAX_VALUE, uinteger.MAX_VALUE),
                message,
                DiagnosticSeverity.Error
            );
        }
    }

    /**
     * Converts a layout error to a diagnostic item
     *
     * @param error the layout error to convert
     * @returns the created diagnostic item
     */
    private convertLayoutError(error: RenderErrors["layoutErrors"][0]): Diagnostic {
        return {
            severity: DiagnosticSeverity.Error,
            range: Range.create(0, 0, uinteger.MAX_VALUE, uinteger.MAX_VALUE),
            message: `Error during layouting: ${error.message}`
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

    override async generateCompletionItems(
        source: string,
        config: DiagramConfig,
        position: Position
    ): Promise<CompletionItem[] | undefined> {
        this.document = TextDocument.create("", "sys", 0, source);
        const items = this.utils.completionEngine.complete(
            this.document.getText(),
            this.utils.diagramEngine.convertConfig(config),
            this.document.offsetAt(position)
        );
        return items;
    }

    override async getSourceRange(element: string): Promise<Range | undefined> {
        if (this.layoutResult == undefined || this.document == undefined) {
            return undefined;
        } else {
            let targetElement = this.layoutResult.layoutElementLookup.get(element);
            while (targetElement != undefined) {
                const source = targetElement.element.getLocalFieldOrUndefined("source")?.source;
                if (source != undefined) {
                    return Range.create(
                        this.document.positionAt(source.position.startOffset),
                        this.document.positionAt(source.position.endOffset)
                    );
                }
                targetElement = targetElement?.parent;
            }
            return undefined;
        }
        return undefined;
    }
}
