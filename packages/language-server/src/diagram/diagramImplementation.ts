import { BaseDiagramLayoutResult } from "@hylimo/diagram";
import { TransactionalAction } from "@hylimo/diagram-protocol";
import { CompletionItem, Diagnostic, Position } from "vscode-languageserver";
import { TransactionalEdit } from "../edit/edits/transactionalEdit";

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
export abstract class DiagramImplementation {
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

    /**
     * Generates autocompletion items for the given position.
     *
     * @param position the position to generate the autocompletion items for
     * @returns the generated autocompletion items
     */
    abstract generateCompletionItems(position: Position): Promise<CompletionItem[] | undefined>;
}
