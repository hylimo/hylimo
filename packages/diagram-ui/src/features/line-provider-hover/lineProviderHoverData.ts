import { ProjectionResult, TransformedLine } from "@hylimo/diagram-common";

/**
 * Line provider hover data
 */
export interface LineProviderHoverData {
    /**
     * The position on the outline of the start element where the connection would start.
     */
    position: number;
    /**
     * The projection result of projecting the mouse position onto the line.
     */
    projectionResult: ProjectionResult;
    /**
     * The line on which the connection would be created in the context of the parent canvas.
     */
    line: TransformedLine;
}

/**
 * Provider for line provider hover data.
 */
export interface LineProviderHoverDataProvider {
    /**
     * Whether the line provider hover UI is currently visible.
     */
    isVisible: boolean;
    /**
     * The line provider hover data itself.
     */
    provider: () => LineProviderHoverData;
    /**
     * The id of the target element.
     */
    target: string;
}
