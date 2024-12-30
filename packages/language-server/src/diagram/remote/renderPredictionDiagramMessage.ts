import { RemoteDiagramMessage } from "./remoteDiagramMessage.js";
import { RemoteMessagePayload } from "@hylimo/diagram-protocol";
import { DiagramConfig, Root } from "@hylimo/diagram-common";

/**
 * Message to request the rendering of a prediction diagram
 */
export interface RequestRenderPredictionDiagramMessage extends RemoteDiagramMessage {
    type: typeof RequestRenderPredictionDiagramMessage.type;
    /**
     * The source code of the diagram
     */
    source: string;
    /**
     * The config of the diagram
     */
    config: DiagramConfig;
}

export namespace RequestRenderPredictionDiagramMessage {
    export const type = "requestRenderPredictionDiagram";
    /**
     * Checks if the given message is a RequestRenderPredictionDiagramMessage
     *
     * @param message the message to check
     * @returns true if the message is a RequestRenderPredictionDiagramMessage
     */
    export function is(message: RemoteMessagePayload): message is RequestRenderPredictionDiagramMessage {
        return message.type === type;
    }
}

/**
 * Message to reply to a RequestRenderPredictionDiagramMessage
 */
export interface ReplyRenderPredictionDiagramMessage extends RemoteMessagePayload {
    type: typeof ReplyRenderPredictionDiagramMessage.type;
    /**
     * The result of the update, contains the new diagram and notifications
     */
    result: Root | undefined;
}

export namespace ReplyRenderPredictionDiagramMessage {
    export const type = "replyRenderPredictionDiagram";

    /**
     * Checks if the given message is a ReplyRenderPredictionDiagramMessage
     *
     * @param message the message to check
     * @returns true if the message is a ReplyRenderPredictionDiagramMessage
     */
    export function is(message: RemoteMessagePayload): message is ReplyRenderPredictionDiagramMessage {
        return message.type === type;
    }
}
