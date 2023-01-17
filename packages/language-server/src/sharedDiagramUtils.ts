import { Interpreter, Parser } from "@hylimo/core";
import { LayoutEngine } from "@hylimo/diagram";
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
     * Layout engine to layout diagrams
     */
    readonly layoutEngine: LayoutEngine;
    /**
     * The maximum amount of execution steps a single execution can use
     */
    readonly maxExecutionSteps: number;
    /**
     * Manages diagram servers
     */
    readonly diagramServerManager: DiagramServerManager;
}
