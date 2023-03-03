import { AutocompletionEngine, Interpreter, Parser } from "@hylimo/core";
import { DiagramEngine } from "@hylimo/diagram";
import { Connection } from "vscode-languageserver";
import { DiagramServerManager } from "./diagramServerManager";

/**
 * Shared utils for each diagram
 */
export interface SharedDiagramUtils {
    /**
     * The connection to use
     */
    readonly connection: Connection;
    /**
     * Interpreter to execute scripts
     */
    readonly interpreter: Interpreter;
    /**
     * Parser to parse scripts
     */
    readonly parser: Parser;
    /**
     * The engine to render diagrams from source
     */
    readonly diagramEngine: DiagramEngine;
    /**
     * Manages diagram servers
     */
    readonly diagramServerManager: DiagramServerManager;
    /**
     * Autocompletion engine to use
     */
    readonly autocompletionEngine: AutocompletionEngine;
}
