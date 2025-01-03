import { Parser } from "@hylimo/core";
import { DiagramEngine } from "@hylimo/diagram";
import { Connection } from "vscode-languageserver";
import { DiagramServerManager } from "./diagramServerManager.js";
import { CompletionEngine } from "./completion/completionEngine.js";
import { Config } from "./config.js";
import { EditHandlerRegistry } from "./edit/handlers/editHandlerRegistry.js";

/**
 * Shared utils for each diagram
 */
export interface SharedDiagramUtils {
    /**
     * The current config to use
     */
    config: Config;
    /**
     * The connection to use
     */
    readonly connection: Connection;
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
    /**
     * Registry for edit handlers
     */
    readonly editHandlerRegistry: EditHandlerRegistry;
}
