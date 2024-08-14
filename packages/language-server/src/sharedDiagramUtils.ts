import { Interpreter, Parser } from "@hylimo/core";
import { DiagramEngine } from "@hylimo/diagram";
import { Connection } from "vscode-languageserver";
import { DiagramServerManager } from "./diagramServerManager.js";
import { DynamicLanguageServerConfig } from "@hylimo/diagram-protocol";
import { CompletionEngine } from "./completion/completionEngine.js";

/**
 * Shared utils for each diagram
 */
export interface SharedDiagramUtils {
    /**
     * The current config to use
     */
    config: DynamicLanguageServerConfig;
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
     * Completion engine to use
     */
    readonly completionEngine: CompletionEngine;
}
