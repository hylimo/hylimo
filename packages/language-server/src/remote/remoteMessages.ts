import { NotificationType, RequestType } from "vscode-languageserver";

export interface RemoteMessage {
    from: number;
    to: number;
    payload: RemoteMessagePayload;
}

export interface RemoteMessagePayload {
    type: string;
}

export namespace RemoteNotification {
    export const type = new NotificationType<RemoteMessage>("remote/notification");
}

export namespace RemoteRequest {
    export const type = new RequestType<RemoteMessage, RemoteMessage, any>("remote/request");
}

export namespace SetSecondaryLanguageServerNotification {
    export const type = new NotificationType<number>("remote/setSecondaryLanguageServer");
}
