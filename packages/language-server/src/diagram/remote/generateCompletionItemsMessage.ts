import { CompletionItem, Position } from "vscode-languageserver";
import { RemoteMessagePayload } from "@hylimo/diagram-protocol";
import { RequestUpdateDiagramMessage } from "./updateDiagramMessage";

/**
 * Message to perform generateCompletionItem on a remote language server
 */
export interface RequestGenerateCompletionItemMessage extends Omit<RequestUpdateDiagramMessage, "type"> {
    type: typeof RequestGenerateCompletionItemMessage.type;
    /**
     * The completion cursor position
     */
    position: Position;
}

export namespace RequestGenerateCompletionItemMessage {
    export const type = "requestGenerateCompletionItem";

    /**
     * Checks if the given message is a RequestGenerateCompletionItemMessage
     * @param message the message to check
     * @returns true if the message is a RequestGenerateCompletionItemMessage
     */
    export function is(message: RemoteMessagePayload): message is RequestGenerateCompletionItemMessage {
        return message.type === type;
    }
}

/**
 * Message to reply to a RequestGenerateCompletionItemMessage
 */
export interface ReplyGenerateCompletionItemMessage extends RemoteMessagePayload {
    type: typeof ReplyGenerateCompletionItemMessage.type;
    /**
     * The generated completion items
     */
    items: CompletionItem[] | undefined;
}

export namespace ReplyGenerateCompletionItemMessage {
    export const type = "replyGenerateCompletionItem";

    /**
     * Checks if the given message is a ReplyGenerateCompletionItemMessage
     * @param message the message to check
     * @returns true if the message is a ReplyGenerateCompletionItemMessage
     */
    export function is(message: RemoteMessagePayload): message is ReplyGenerateCompletionItemMessage {
        return message.type === type;
    }
}
