import type { CompletionItem, Diagnostic, Position, Range } from "vscode-languageserver";
import type { DiagramConfig, Root } from "@hylimo/diagram-common";

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
    rootElement?: Root;
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
     * Generates completion items for the given position.
     *
     * @param source the source code of the diagram
     * @param config the config of the diagram
     * @param position the position to generate the completion items for
     * @returns the generated completion items
     */
    abstract generateCompletionItems(
        source: string,
        config: DiagramConfig,
        position: Position
    ): Promise<CompletionItem[] | undefined>;

    /**
     * Gets the source range of an element
     *
     * @param element the id of the element
     * @returns the source range of the element
     */
    abstract getSourceRange(element: string): Promise<Range | undefined>;

    /**
     * Renders a diagram in prediction mode
     * This is usually used to only render a part of the diagram, i.e. to render the probable result within the toolbox as a preview
     *
     * @param source the source code of the diagram
     * @param config the config of the diagram
     * @returns the rendered diagram
     */
    abstract renderPredictionDiagram(source: string, config: DiagramConfig): Promise<Root | undefined>;
}
