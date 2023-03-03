import { TransactionalAction } from "@hylimo/diagram-protocol";
import { TransactionalEdit } from "../../edit/edits/transactionalEdit";
import { RemoteDiagramMessage } from "./remoteDiagramMessage";
import { RemoteMessagePayload } from "../../../../diagram-protocol/src/lsp/remoteMessages";

/**
 * Message to perform generateTransactionalEdit on a remote language server
 */
export interface RequestGenerateTransactionalEditMessage extends RemoteDiagramMessage {
    type: typeof RequestGenerateTransactionalEditMessage.type;
    /**
     * The action to generate the edit for
     */
    action: TransactionalAction;
}

export namespace RequestGenerateTransactionalEditMessage {
    export const type = "requestGenerateTransactionalEdit";

    /**
     * Checks if the given message is a RequestGenerateTransactionalEditMessage
     * @param message the message to check
     * @returns true if the message is a RequestGenerateTransactionalEditMessage
     */
    export function is(message: RemoteMessagePayload): message is RequestGenerateTransactionalEditMessage {
        return message.type === type;
    }
}

/**
 * Message to reply to a RequestGenerateTransactionalEditMessage
 */
export interface ReplyGenerateTransactionalEditMessage extends RemoteMessagePayload {
    type: typeof ReplyGenerateTransactionalEditMessage.type;
    /**
     * The edit generated by the language server
     */
    edit: TransactionalEdit;
}

export namespace ReplyGenerateTransactionalEditMessage {
    export const type = "replyGenerateTransactionalEdit";

    /**
     * Checks if the given message is a ReplyGenerateTransactionalEditMessage
     * @param message the message to check
     * @returns true if the message is a ReplyGenerateTransactionalEditMessage
     */
    export function is(message: RemoteMessagePayload): message is ReplyGenerateTransactionalEditMessage {
        return message.type === type;
    }
}