import { InterpreterModule, Interpreter } from "@hylimo/core";
import {
    Connection,
    InitializeResult,
    ServerCapabilities,
    TextDocumentChangeEvent,
    TextDocuments
} from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { Diagram } from "./diagram";

/**
 * Config for creating a new language server
 */
export interface LanguageServerConfig {
    /**
     * The connection to use
     */
    connection: Connection;
    /**
     * Modules for running the interpreter
     */
    interpreterModules: InterpreterModule[];
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
     * Lookup of all known diagrams
     */
    private readonly diagrams = new Map<string, Diagram>();

    /**
     * Creates a new language server
     *
     * @param config configures the language server
     */
    constructor(readonly config: LanguageServerConfig) {
        this.connection = config.connection;
        this.connection.onInitialize(this.onInitialize.bind(this));
        this.textDocuments.listen(this.connection);
        this.interpreter = new Interpreter(config.interpreterModules);
        this.textDocuments.onDidOpen(this.onDidOpenTextDocument.bind(this));
        this.textDocuments.onDidClose(this.onDidCloseTextDocument.bind(this));
        this.textDocuments.onDidChangeContent(this.onDidChangeContentTextDocument.bind(this));
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
        const capabilities: ServerCapabilities = {};
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
    private onDidChangeContentTextDocument(e: TextDocumentChangeEvent<TextDocument>): void {
        console.log("content changed");
    }
}
