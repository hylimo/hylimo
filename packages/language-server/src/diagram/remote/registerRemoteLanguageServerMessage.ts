import { RemoteMessagePayload } from "../../../../diagram-protocol/src/lsp/remoteMessages";

/**
 * Message to register a remote language server.
 * This message must be sent by a secondary language server to the primary language server.
 */
export interface RegisterRemoteLanguageServerMessage extends RemoteMessagePayload {
    type: typeof RegisterRemoteLanguageServerMessage.type;
}

export namespace RegisterRemoteLanguageServerMessage {
    export const type = "registerRemoteLanguageServer";

    /**
     * Checks if the given message is a RegisterRemoteLanguageServerMessage
     *
     * @param message the message to check
     * @returns true if the message is a RegisterRemoteLanguageServerMessage
     */
    export function is(message: RemoteMessagePayload): message is RegisterRemoteLanguageServerMessage {
        return message.type === type;
    }
}
