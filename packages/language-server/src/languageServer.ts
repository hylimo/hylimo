import { InterpreterModule, Interpreter, Parser, defaultModules } from "@hylimo/core";
import {
    Connection,
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
import { SharedDiagramUtils } from "./sharedDiagramUtils";

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
     * Formatter to use for formatting requests
     */
    private readonly formatter: Formatter;

    /**
     * Lookup of all known diagrams
     */
    private readonly diagrams = new Map<string, Diagram>();

    /**
     * Manages diagram servers
     */
    private readonly diagramServerManager: DiagramServerManager;

    /**
     * Shared utils for diagrams
     */
    private readonly diagramUtils: SharedDiagramUtils;

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
        this.diagramUtils = {
            connection: this.connection,
            interpreter: new Interpreter(interpreterModules),
            parser: new Parser(true),
            layoutEngine: new LayoutEngine(),
            maxExecutionSteps: config.maxExecutionSteps,
            diagramServerManager: this.diagramServerManager
        };
        this.formatter = new Formatter(this.diagramUtils.parser);
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
        this.diagrams.set(e.document.uri, new Diagram(e.document, this.diagramUtils));
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
        await diagram.onDidChangeContent();
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
