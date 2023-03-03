import { NotificationType, RequestType } from "vscode-languageserver-protocol";

/**
 * Base interface for all messages sent between language servers.
 */
export interface RemoteMessage {
    /**
     * The id of the sender language server
     */
    from: number;
    /**
     * The id of the receiver language server
     */
    to: number;
    /**
     * The payload of the message
     */
    payload: RemoteMessagePayload;
}

/**
 * Base interface for all payloads of messages sent between language servers.
 */
export interface RemoteMessagePayload {
    /**
     * The type of the message
     */
    type: string;
}

export namespace RemoteNotification {
    /**
     * Notification type for sending notifications to a remote language server
     */
    export const type = new NotificationType<RemoteMessage>("remote/notification");
}

export namespace RemoteRequest {
    /**
     * Request type for sending requests to a remote language server
     */
    export const type = new RequestType<RemoteMessage, RemoteMessage, any>("remote/request");
}

export namespace SetLanguageServerIdNotification {
    /**
     * Notification type for marking this language server as a secondary language server
     */
    export const type = new NotificationType<number>("remote/setId");
}
