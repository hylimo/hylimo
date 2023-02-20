import { BaseDiagramLayoutResult } from "@hylimo/diagram";
import { TransactionalAction } from "@hylimo/diagram-common";
import { Diagnostic } from "vscode-languageserver";
import { TransactionalEdit } from "./edit/edits/transactionalEdit";
import { LayoutedDiagramManager } from "./remote/layoutedDiagramManager";

/**
 * Handles a diagram.
 * The implementation can be either local or on a remote language server
 */
export class LayoutedDiagram {
    /**
     * The implementation to which all requests are delegated
     */
    private implementation?: LayoutedDiagramImplementation;

    constructor(private readonly id: string, private readonly layoutedDiagramManager: LayoutedDiagramManager) {}

    /**
     * Updates the diagram with the given new source
     *
     * @param source the source code of the diagram
     * @returns the result of the update
     */
    async updateDiagram(source: string): Promise<DiagramUpdateResult> {
        this.implementation = this.layoutedDiagramManager.getNewLayoutedDiagramImplementation(
            this.id,
            this.implementation
        );
        return this.implementation.updateDiagram(source);
    }

    /**
     * Generates a transactional edit for the given transactional action.
     * Throws an error if updateDiagram has not been called yet.
     *
     * @param action the action to generate the edit for
     * @returns the generated transactional edit
     */
    async generateTransactionalEdit(action: TransactionalAction): Promise<TransactionalEdit> {
        if (this.implementation == undefined) {
            throw new Error("Cannot generate transactional edit without implementation");
        }
        return this.implementation.generateTransactionalEdit(action);
    }
}

/**
 * Result of a diagram update
 */
export interface DiagramUpdateResult {
    /**
     * Created diagnostics for errors and warnings
     */
    diagnostics: Diagnostic[];
    /**
     * The layouted diagram
     */
    diagram?: BaseDiagramLayoutResult;
}

/**
 * Implementation of a layouted diagram.
 * Can be either local or remote
 */
export abstract class LayoutedDiagramImplementation {
    /**
     * Updates the diagram with the given new source
     *
     * @param source the source code of the diagram
     * @returns the result of the update
     */
    abstract updateDiagram(source: string): Promise<DiagramUpdateResult>;

    /**
     * Generates a transactional edit for the given transactional action.
     *
     * @param action the action to generate the edit for
     * @returns the generated transactional edit
     */
    abstract generateTransactionalEdit(action: TransactionalAction): Promise<TransactionalEdit>;
}
