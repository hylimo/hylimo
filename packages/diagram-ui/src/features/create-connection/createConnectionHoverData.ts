import { Point, ProjectionResult, TransformedLine } from "@hylimo/diagram-common";

/**
 * Hover data for creating a connection
 */
export type CreateConnectionHoverData = LineProviderHoverData | RootHoverData;

/**
 * Line provider hover data
 */
export interface LineProviderHoverData extends Point {
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
    /**
     * The id of the target element.
     */
    target: string;
    /**
     * The provider to get the connection edit expression
     */
    editExpression: string;
}

/**
 * Root hover data
 */
export type RootHoverData = Point;
