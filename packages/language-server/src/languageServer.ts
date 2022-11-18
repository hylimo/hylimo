import { InterpreterModule, Interpreter } from "@hylimo/core";
import { Connection, TextDocumentChangeEvent, TextDocuments } from "vscode-languageserver";
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
        this.textDocuments.listen(this.connection);
        this.interpreter = new Interpreter(config.interpreterModules);
        this.textDocuments.onDidOpen(this.onDidOpenTextDocument);
        this.textDocuments.onDidClose(this.onDidCloseTextDocument);
        this.textDocuments.onDidChangeContent(this.onDidChangeContentTextDocument);
    }

    /**
     * Listens on the connection
     * must be called
     */
    listen(): void {
        this.connection.listen();
    }

    /**
     * Callback for textDocuments.onDidOpen
     *
     * @param e the provided event
     */
    private onDidOpenTextDocument(e: TextDocumentChangeEvent<TextDocument>): void {
        console.log("open")
        this.diagrams.set(e.document.uri, new Diagram(e.document));
    }

    /**
     * Callback for textDocuments.onDidClose
     *
     * @param e the provided event
     */
    private onDidCloseTextDocument(e: TextDocumentChangeEvent<TextDocument>): void {
        console.log("close")
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
