import { DiagramUpdateResult } from "../diagramImplementation.js";
import { RemoteDiagramMessage } from "./remoteDiagramMessage.js";
import { RemoteMessagePayload } from "@hylimo/diagram-protocol";
import { DiagramConfig } from "@hylimo/diagram-common";

/**
 * Message to request an update of a diagram
 */
export interface RequestUpdateDiagramMessage extends RemoteDiagramMessage {
    type: typeof RequestUpdateDiagramMessage.type;
    /**
     * The source code of the diagram
     */
    source: string;
    /**
     * The config of the diagram
     */
    config: DiagramConfig;
}

export namespace RequestUpdateDiagramMessage {
    export const type = "requestUpdateDiagram";
    /**
     * Checks if the given message is a RequestUpdateDiagramMessage
     *
     * @param message the message to check
     * @returns true if the message is a RequestUpdateDiagramMessage
     */
    export function is(message: RemoteMessagePayload): message is RequestUpdateDiagramMessage {
        return message.type === type;
    }
}

/**
 * Message to reply to a RequestUpdateDiagramMessage
 */
export interface ReplyUpdateDiagramMessage extends RemoteMessagePayload {
    type: typeof ReplyUpdateDiagramMessage.type;
    /**
     * The result of the update, contains the new diagram and notifications
     */
    result: DiagramUpdateResult;
}

export namespace ReplyUpdateDiagramMessage {
    export const type = "replyUpdateDiagram";

    /**
     * Checks if the given message is a ReplyUpdateDiagramMessage
     *
     * @param message the message to check
     * @returns true if the message is a ReplyUpdateDiagramMessage
     */
    export function is(message: RemoteMessagePayload): message is ReplyUpdateDiagramMessage {
        return message.type === type;
    }
}
