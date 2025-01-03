import { LayoutedDiagram, RenderErrors } from "@hylimo/diagram";
import {
    Diagnostic,
    DiagnosticSeverity,
    uinteger,
    Range,
    CompletionItem,
    Position,
    TextEdit
} from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { DiagramImplementation, DiagramUpdateResult } from "../diagramImplementation.js";
import { SharedDiagramUtils } from "../../sharedDiagramUtils.js";
import { DiagramConfig, Root } from "@hylimo/diagram-common";
import { Expression, isWrapperObject } from "@hylimo/core";

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
        const range = error.range;
        let location: Range;
        if (!Number.isNaN(error.token.startLine)) {
            location = this.convertRange(range);
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
        const range = error.findFirstRange();
        const message = error.message || "[no message provided]";
        if (range != undefined) {
            return Diagnostic.create(this.convertRange(range), message, DiagnosticSeverity.Error);
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

    override async generateCompletionItems(
        source: string,
        config: DiagramConfig,
        position: Position
    ): Promise<CompletionItem[] | undefined> {
        this.document = TextDocument.create("", "sys", 0, source);
        const items = this.utils.completionEngine.complete(
            this.document.getText(),
            config,
            this.document.offsetAt(position)
        );
        return items?.map((item) => {
            return {
                ...item,
                textEdit: TextEdit.replace(this.convertRange(item.textEdit.range), item.textEdit.text)
            };
        });
    }

    override async getSourceRange(element: string): Promise<Range | undefined> {
        if (this.layoutResult == undefined || this.document == undefined) {
            return undefined;
        }
        let targetElement = this.layoutResult.layoutElementLookup.get(element);
        while (targetElement != undefined) {
            const source = targetElement.element.getLocalFieldOrUndefined("source")?.value;
            if (source != undefined && isWrapperObject(source)) {
                const target = source.wrapped as Expression;
                const [start, end] = target.range;
                return Range.create(this.document.positionAt(start), this.document.positionAt(end));
            }
            targetElement = targetElement?.parent;
        }
        return undefined;
    }

    /**
     * Converts an AST range to a LSP range
     *
     * @param range the range to convert
     * @returns the converted range
     */
    private convertRange(range: [number, number]): Range {
        if (this.document == undefined) {
            throw new Error("Document not set");
        }
        const [start, end] = range;
        return Range.create(this.document.positionAt(start), this.document.positionAt(end));
    }

    override async renderPredictionDiagram(source: string, config: DiagramConfig): Promise<Root | undefined> {
        const renderResult = await this.utils.diagramEngine.render(source, config, true);
        return renderResult.layoutedDiagram?.rootElement;
    }
}
