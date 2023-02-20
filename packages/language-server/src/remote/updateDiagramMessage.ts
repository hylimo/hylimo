import { DiagramUpdateResult } from "../layoutedDiagram";
import { RemoteDiagramMessage } from "./remoteDiagramMessage";
import { RemoteMessagePayload } from "./remoteMessages";

export interface RequestUpdateDiagramMessage extends RemoteDiagramMessage {
    type: typeof RequestUpdateDiagramMessage.type;
    source: string;
}

export namespace RequestUpdateDiagramMessage {
    export const type = "requestUpdateDiagram";
    export function is(message: RemoteMessagePayload): message is RequestUpdateDiagramMessage {
        return message.type === type;
    }
}

export interface ReplyUpdateDiagramMessage extends RemoteMessagePayload {
    type: typeof ReplyUpdateDiagramMessage.type;
    result: DiagramUpdateResult;
}

export namespace ReplyUpdateDiagramMessage {
    export const type = "replyUpdateDiagram";
    export function is(message: RemoteMessagePayload): message is ReplyUpdateDiagramMessage {
        return message.type === type;
    }
}
