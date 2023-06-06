import { InterpreterModule, Interpreter, Parser, defaultModules } from "@hylimo/core";
import {
    CompletionItem,
    CompletionParams,
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
import { TextDocument, TextDocumentContentChangeEvent } from "vscode-languageserver-textdocument";
import { Diagram } from "./diagram/diagram";
import { Formatter } from "./formatter";
import { DiagramEngine, diagramModule, dslModule, LayoutEngine } from "@hylimo/diagram";
import { DiagramServerManager } from "./diagramServerManager";
import {
    DiagramActionNotification,
    DiagramCloseNotification,
    DiagramOpenNotification,
    OpenDiagramMessage,
    SetLanguageServerIdNotification,
    ConfigNotification,
    DynamicLanguageServerConfig
} from "@hylimo/diagram-protocol";
import { SharedDiagramUtils } from "./sharedDiagramUtils";
import { LocalDiagramImplementationManager } from "./diagram/local/localDiagramImplementationManager";
import { DiagramImplementationManager } from "./diagram/diagramImplementationManager";
import { RemoteDiagramImplementationManager } from "./diagram/remote/remoteDiagramImplementationManager";
import { CompletionEngine } from "./completion/completionEngine";

/**
 * Config for creating a new language server
 */
export interface LanguageServerConfig {
    /**
     * The default config to use
     */
    defaultConfig: DynamicLanguageServerConfig;
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
    private readonly textDocuments = new TextDocuments({
        create: TextDocument.create,
        update: this.updateTextDocument.bind(this)
    });

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
     * Manages layouted diagrams.
     * Can be either a local or remote implementation
     */
    private layoutedDiagramManager: DiagramImplementationManager;

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
        const interpreterModules = [
            ...defaultModules,
            diagramModule,
            dslModule,
            ...config.additionalInterpreterModules
        ];
        const interpreter = new Interpreter(interpreterModules, config.maxExecutionSteps);
        const parser = new Parser();
        this.diagramUtils = {
            config: config.defaultConfig,
            connection: this.connection,
            interpreter,
            parser,
            diagramEngine: new DiagramEngine(parser, interpreter, new LayoutEngine()),
            diagramServerManager: this.diagramServerManager,
            completionEngine: new CompletionEngine(interpreter)
        };
        this.layoutedDiagramManager = new RemoteDiagramImplementationManager(this.diagramUtils);
        this.formatter = new Formatter(this.diagramUtils.parser);
        this.textDocuments.onDidOpen(this.onDidOpenTextDocument.bind(this));
        this.textDocuments.onDidClose(this.onDidCloseTextDocument.bind(this));
        this.textDocuments.onDidChangeContent(this.onDidChangeContentTextDocument.bind(this));
        this.connection.onDocumentFormatting(this.onDocumentFormatting.bind(this));
        this.connection.onCompletion(this.onCompletion.bind(this));
        this.connection.onNotification(DiagramOpenNotification.type, this.onOpenDiagram.bind(this));
        this.connection.onNotification(DiagramActionNotification.type, (message) => {
            this.diagramServerManager.acceptAction(message);
        });
        this.connection.onNotification(DiagramCloseNotification.type, (clientId) => {
            this.diagramServerManager.removeClient(clientId);
        });
        this.connection.onNotification(
            SetLanguageServerIdNotification.type,
            this.onSetSecondaryLanguageServer.bind(this)
        );
        this.connection.onNotification(ConfigNotification.type, this.onUpdateConfig.bind(this));
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
            documentFormattingProvider: true,
            completionProvider: {
                triggerCharacters: "!#%&'*+-/:;<=>?@\\^`|~.$_".split("")
            }
        };
        return { capabilities };
    }

    /**
     * Callback for textDocuments.onDidOpen
     *
     * @param e the provided event
     */
    private onDidOpenTextDocument(e: TextDocumentChangeEvent<TextDocument>): void {
        this.diagrams.set(e.document.uri, new Diagram(e.document, this.diagramUtils, this.layoutedDiagramManager));
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
     * Updates a TextDocument by modifying its content
     *
     * @param document the document to update
     * @param changes the changes to apply to the document
     * @param version the new version of the document
     * @returns the updated document
     */
    private updateTextDocument(
        document: TextDocument,
        changes: TextDocumentContentChangeEvent[],
        version: number
    ): TextDocument {
        const diagram = this.diagrams.get(document.uri)!;
        diagram.updateCurrentTransaction(changes);
        return TextDocument.update(document, changes, version);
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
     *
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
     * Callback for onCompletion
     *
     * @param params defines the document and position
     * @returns the completion items
     */
    private async onCompletion(params: CompletionParams): Promise<CompletionItem[] | undefined> {
        const diagram = this.diagrams.get(params.textDocument.uri)!;
        return diagram.generateCompletionItems(params.position);
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

    /**
     * Sets this language server to use a secondary language server
     *
     * @param id the id of the secondary language server
     */
    private onSetSecondaryLanguageServer(id: number): void {
        if (id > 0) {
            this.layoutedDiagramManager = new LocalDiagramImplementationManager(this.diagramUtils, id);
        }
    }

    /**
     * Updates the config of this language server
     *
     * @param params the new config
     */
    private onUpdateConfig(params: DynamicLanguageServerConfig): void {
        this.diagramUtils.config = params;
        for (const diagram of this.diagrams.values()) {
            diagram.onDidChangeConfig();
        }
    }
}
