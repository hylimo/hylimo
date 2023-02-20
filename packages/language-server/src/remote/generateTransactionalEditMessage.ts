import { TransactionalAction } from "@hylimo/diagram-common";
import { TransactionalEdit } from "../edit/edits/transactionalEdit";
import { RemoteDiagramMessage } from "./remoteDiagramMessage";
import { RemoteMessagePayload } from "./remoteMessages";

export interface RequestGenerateTransactionalEditMessage extends RemoteDiagramMessage {
    type: typeof RequestGenerateTransactionalEditMessage.type;
    action: TransactionalAction;
}

export namespace RequestGenerateTransactionalEditMessage {
    export const type = "requestGenerateTransactionalEdit";
    export function is(message: RemoteMessagePayload): message is RequestGenerateTransactionalEditMessage {
        return message.type === type;
    }
}

export interface ReplyGenerateTransactionalEditMessage extends RemoteMessagePayload {
    type: typeof ReplyGenerateTransactionalEditMessage.type;
    edit: TransactionalEdit;
}

export namespace ReplyGenerateTransactionalEditMessage {
    export const type = "replyGenerateTransactionalEdit";
    export function is(message: RemoteMessagePayload): message is ReplyGenerateTransactionalEditMessage {
        return message.type === type;
    }
}
