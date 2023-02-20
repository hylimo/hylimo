import { LayoutedDiagramImplementation } from "../layoutedDiagram";
import { SharedDiagramUtils } from "../sharedDiagramUtils";
import {
    ReplyGenerateTransactionalEditMessage,
    RequestGenerateTransactionalEditMessage
} from "./generateTransactionalEditMessage";
import { LayoutedDiagramManager } from "./layoutedDiagramManager";
import { LocalLayoutedDiagram } from "./localLayoutedDiagram";
import { RemoteMessagePayload } from "./remoteMessages";
import { ReplyUpdateDiagramMessage, RequestUpdateDiagramMessage } from "./updateDiagramMessage";

export class LocalLayoutedDiagramManager extends LayoutedDiagramManager {
    private readonly implementations = new Map<string, LayoutedDiagramImplementation>();

    constructor(private readonly utils: SharedDiagramUtils, id: number) {
        super(utils.connection, id);
    }

    protected override async handleNotification(_message: RemoteMessagePayload, _from: number): Promise<void> {
        throw new Error("LocalLayoutedDiagramManager does not handle notifications");
    }

    protected override async handleRequest(
        message: RemoteMessagePayload,
        _from: number
    ): Promise<RemoteMessagePayload> {
        if (RequestUpdateDiagramMessage.is(message)) {
            const implementation = this.getNewLayoutedDiagramImplementation(message.id);
            const result: ReplyUpdateDiagramMessage = {
                type: ReplyUpdateDiagramMessage.type,
                result: await implementation.updateDiagram(message.source)
            };
            return result;
        } else if (RequestGenerateTransactionalEditMessage.is(message)) {
            const implementation = this.getNewLayoutedDiagramImplementation(message.id);
            const result: ReplyGenerateTransactionalEditMessage = {
                type: ReplyGenerateTransactionalEditMessage.type,
                edit: await implementation.generateTransactionalEdit(message.action)
            };
            return result;
        } else {
            throw new Error("Unexpected message type");
        }
    }

    override getNewLayoutedDiagramImplementation(
        id: string,
        old?: LayoutedDiagramImplementation | undefined
    ): LayoutedDiagramImplementation {
        if (old != undefined) {
            return old;
        } else {
            if (this.implementations.has(id)) {
                return this.implementations.get(id)!;
            } else {
                const newImplementation = new LocalLayoutedDiagram(this.utils);
                this.implementations.set(id, newImplementation);
                return newImplementation;
            }
        }
    }
}
