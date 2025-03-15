import type { RemoteMessagePayload } from "@hylimo/diagram-protocol";

/**
 * Base interface for all messages that are related to a diagram.
 */
export interface RemoteDiagramMessage extends RemoteMessagePayload {
    /**
     * The id of the diagram.
     */
    id: string;
}
