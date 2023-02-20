import { RemoteMessagePayload } from "./remoteMessages";

export interface RegisterRemoteLanguageServerMessage extends RemoteMessagePayload {
    type: typeof RegisterRemoteLanguageServerMessage.type;
}

export namespace RegisterRemoteLanguageServerMessage {
    export const type = "registerRemoteLanguageServer";
    export function is(message: RemoteMessagePayload): message is RegisterRemoteLanguageServerMessage {
        return message.type === type;
    }
}
