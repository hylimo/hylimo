import type { Range } from "vscode-languageserver";
import type { RemoteDiagramMessage } from "./remoteDiagramMessage.js";
import type { RemoteMessagePayload } from "@hylimo/diagram-protocol";

/**
 * Message to request the source range of an element
 */
export interface RequestGetSourceRangeMessage extends RemoteDiagramMessage {
    type: typeof RequestGetSourceRangeMessage.type;
    /**
     * The id of the element to get the source range for
     */
    element: string;
}

export namespace RequestGetSourceRangeMessage {
    export const type = "requestGetSourceRange";

    /**
     * Checks if the given message is a RequestGetSourceRangeMessage
     *
     * @param message the message to check
     * @returns true if the message is a RequestGetSourceRangeMessage
     */
    export function is(message: any): message is RequestGetSourceRangeMessage {
        return message.type === type;
    }
}

/**
 * Message to reply to a RequestGetSourceRangeMessage
 */
export interface ReplyGetSourceRangeMessage extends RemoteMessagePayload {
    type: typeof ReplyGetSourceRangeMessage.type;

    /**
     * The source range of the element
     */
    range: Range | undefined;
}

export namespace ReplyGetSourceRangeMessage {
    export const type = "replyGetSourceRange";

    /**
     * Checks if the given message is a ReplyGetSourceRangeMessage
     *
     * @param message the message to check
     * @returns true if the message is a ReplyGetSourceRangeMessage
     */
    export function is(message: any): message is ReplyGetSourceRangeMessage {
        return message.type === type;
    }
}
