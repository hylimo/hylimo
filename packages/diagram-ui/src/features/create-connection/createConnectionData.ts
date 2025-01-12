import { TransformedLine } from "@hylimo/diagram-common";

/**
 * Connection creation data
 */
export interface CreateConnectionData {
    /**
     * The edit to perform
     */
    edit: `connection/${string}`;
    /**
     * The position on the outline of the start element where the connection would start.
     */
    position: number;
    /**
     * The line on which the connection would be created.
     */
    line: TransformedLine;
}

export namespace CreateConnectionData {
    /**
     * CSS class assigned to all connection creation UI elements.
     */
    export const CLASS = "create-connection-target";
}

/**
 * Provider for connection creation data.
 */
export interface CreateConnectionDataProvider {
    /**
     * Whether the connection creation UI is currently visible.
     */
    isVisible: boolean;
    /**
     * The connection creation data itself.
     */
    provider: () => CreateConnectionData;
    /**
     * The id of the target element.
     */
    target: string;
}
