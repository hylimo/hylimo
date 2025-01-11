import { TransformedLine } from "@hylimo/diagram-common";

/**
 * Preview of a connection creation.
 */
export interface ConnectionCreationPreview {
    /**
     * The expression which evaluates to the start element of the connection.
     */
    startElementEditExpression: string;
    /**
     * The position on the outline of the start element where the connection would start.
     */
    position: number;
    /**
     * The line on which the connection would be created.
     */
    line: TransformedLine;
}

export namespace ConnectionCreationPreview {
    /**
     * CSS class assigned to all connection creation preview UI elements.
     */
    export const CLASS = "connection-creation-preview";
}

/**
 * Provider for the connection creation preview.
 */
export interface ConnectionCreationPreviewProvider {
    /**
     * Whether the preview is currently visible.
     */
    isVisible: boolean;
    /**
     * The preview itself.
     */
    provider: () => ConnectionCreationPreview;
}
