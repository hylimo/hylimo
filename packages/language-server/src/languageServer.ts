import { InterpreterModule, Interpreter, Parser, CstResult, defaultModules, FullObject } from "@hylimo/core";
import {
    Connection,
    Diagnostic,
    DiagnosticSeverity,
    DocumentFormattingParams,
    InitializeResult,
    Range,
    ServerCapabilities,
    TextDocumentChangeEvent,
    TextDocuments,
    TextEdit,
    uinteger
} from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { Diagram } from "./diagram";
import { Formatter } from "./formatter";
import { diagramModule, LayoutEngine } from "@hylimo/diagram";
import { DiagramServerManager } from "./diagramServerManager";
import {
    DiagramActionNotification,
    DiagramCloseNotification,
    DiagramOpenNotification,
    OpenDiagramMessage
} from "./diagramNotificationTypes";

/**
 * Config for creating a new language server
 */
export interface LanguageServerConfig {
    /**
     * The connection to use
     */
    connection: Connection;
    /**
     * Additional modules for running the interpreter
     */
    additionalInterpreterModules: InterpreterModule[];
    /**
     * The maximum amount of execution steps a single execution can use
     */
    maxExecutionSteps: number;
}

/**
 * Default language server
 */
export class LanguageServer {
    /**
     * The connection to use
     */
    private readonly connection: Connection;

    /**
     * Used to sync textdocuments
     */
    private readonly textDocuments = new TextDocuments(TextDocument);

    /**
     * Interpreter used to run the code
     */
    private readonly interpreter;

    /**
     * Parser used to parse the document
     */
    private readonly parser = new Parser(true);

    /**
     * Formatter to use for formatting requests
     */
    private readonly formatter = new Formatter(this.parser);

    /**
     * Lookup of all known diagrams
     */
    private readonly diagrams = new Map<string, Diagram>();

    /**
     * Manages diagram servers
     */
    private readonly diagramServerManager: DiagramServerManager;

    /**
     * Performs layouting of diagrams
     */
    private readonly layoutEngine = new LayoutEngine();

    /**
     * Creates a new language server
     *
     * @param config configures the language server
     */
    constructor(readonly config: LanguageServerConfig) {
        this.connection = config.connection;
        this.connection.onInitialize(this.onInitialize.bind(this));
        this.diagramServerManager = new DiagramServerManager(this.connection);
        this.textDocuments.listen(this.connection);
        const interpreterModules = [...defaultModules, diagramModule, ...config.additionalInterpreterModules];
        this.interpreter = new Interpreter(interpreterModules);
        this.textDocuments.onDidOpen(this.onDidOpenTextDocument.bind(this));
        this.textDocuments.onDidClose(this.onDidCloseTextDocument.bind(this));
        this.textDocuments.onDidChangeContent(this.onDidChangeContentTextDocument.bind(this));
        this.connection.onDocumentFormatting(this.onDocumentFormatting.bind(this));
        this.connection.onNotification(DiagramOpenNotification.type, this.onOpenDiagram.bind(this));
        this.connection.onNotification(DiagramActionNotification.type, (message) => {
            this.diagramServerManager.acceptAction(message);
        });
        this.connection.onNotification(DiagramCloseNotification.type, (clientId) => {
            this.diagramServerManager.removeClient(clientId);
        });
    }

    /**
     * Listens on the connection
     * must be called
     */
    listen(): void {
        this.connection.listen();
    }

    /**
     * Called on initialize
     *
     * @returns the init result including capabilities
     */
    private onInitialize(): InitializeResult {
        const capabilities: ServerCapabilities = {
            documentFormattingProvider: true
        };
        return { capabilities };
    }

    /**
     * Callback for textDocuments.onDidOpen
     *
     * @param e the provided event
     */
    private onDidOpenTextDocument(e: TextDocumentChangeEvent<TextDocument>): void {
        this.diagrams.set(e.document.uri, new Diagram(e.document));
    }

    /**
     * Callback for textDocuments.onDidClose
     *
     * @param e the provided event
     */
    private onDidCloseTextDocument(e: TextDocumentChangeEvent<TextDocument>): void {
        this.diagrams.delete(e.document.uri);
    }

    /**
     * Callback for textDocuments.onDidClose
     *
     * @param e the provided event
     */
    private async onDidChangeContentTextDocument(e: TextDocumentChangeEvent<TextDocument>): Promise<void> {
        const diagram = this.diagrams.get(e.document.uri)!;
        const parserResult = this.parser.parse(e.document.getText());
        diagram.lastParserResult = parserResult;
        const diagnostics: Diagnostic[] = [];
        diagnostics.push(...this.getParserResultDiagnostics(e.document, parserResult));
        if (parserResult.ast) {
            const interpretationResult = this.interpreter.run(parserResult.ast, this.config.maxExecutionSteps);
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
                const layoutedDiagram = await this.layoutEngine.layout(interpretationResult.result as FullObject);
                diagram.layoutedDiagram = layoutedDiagram;
                this.diagramServerManager.updatedDiagram(diagram);
            }
        }
        this.connection.sendDiagnostics({
            uri: e.document.uri,
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
     * Callback for onDocumentFormatting
     * @param params defines the document and additional options
     * @returns edits which define how to update the document
     */
    private onDocumentFormatting(params: DocumentFormattingParams): TextEdit[] {
        const diagram = this.diagrams.get(params.textDocument.uri)!;
        return [
            TextEdit.replace(
                Range.create(0, 0, uinteger.MAX_VALUE, uinteger.MAX_VALUE),
                this.formatter.formatDocument(diagram.document, {
                    useTabs: !params.options.insertSpaces,
                    tabWidth: params.options.tabSize
                })
            )
        ];
    }

    /**
     * Registers a diagram client
     *
     * @param params defines the id of the client and the diagram to open
     */
    private onOpenDiagram(params: OpenDiagramMessage): void {
        const diagram = this.diagrams.get(params.diagramUri);
        if (!diagram) {
            throw new Error(`Unknown diagram: ${params.diagramUri}`);
        }
        this.diagramServerManager.addClient(params.clientId, diagram);
    }
}
