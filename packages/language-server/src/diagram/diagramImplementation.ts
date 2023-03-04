import { BaseLayoutedDiagram } from "@hylimo/diagram";
import { TransactionalAction } from "@hylimo/diagram-protocol";
import { CompletionItem, Diagnostic, Position } from "vscode-languageserver";
import { TransactionalEdit } from "../edit/edits/transactionalEdit";
import { DiagramConfig } from "@hylimo/diagram-common";

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
    diagram?: BaseLayoutedDiagram;
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
     * @param config the config of the diagram
     * @returns the result of the update
     */
    abstract updateDiagram(source: string, config: DiagramConfig): Promise<DiagramUpdateResult>;

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
     * @param source the source code of the diagram
     * @param config the config of the diagram
     * @param position the position to generate the autocompletion items for
     * @returns the generated autocompletion items
     */
    abstract generateCompletionItems(
        source: string,
        config: DiagramConfig,
        position: Position
    ): Promise<CompletionItem[] | undefined>;
}
