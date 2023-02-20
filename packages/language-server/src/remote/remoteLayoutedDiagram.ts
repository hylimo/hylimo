import { TransactionalAction } from "@hylimo/diagram-common";
import { TransactionalEdit } from "../edit/edits/transactionalEdit";
import { DiagramUpdateResult, LayoutedDiagramImplementation } from "../layoutedDiagram";
import {
    ReplyGenerateTransactionalEditMessage,
    RequestGenerateTransactionalEditMessage
} from "./generateTransactionalEditMessage";
import { RemoteLayoutedDiagramManager } from "./remoteLayoutedDiagramManager";
import { ReplyUpdateDiagramMessage, RequestUpdateDiagramMessage } from "./updateDiagramMessage";

export class RemoteLayoutedDiagram extends LayoutedDiagramImplementation {
    constructor(
        private readonly layoutedDiagramManager: RemoteLayoutedDiagramManager,
        private readonly remoteId: number,
        private readonly id: string
    ) {
        super();
    }

    override async updateDiagram(source: string): Promise<DiagramUpdateResult> {
        const request: RequestUpdateDiagramMessage = {
            type: RequestUpdateDiagramMessage.type,
            id: this.id,
            source
        };
        const result = await this.layoutedDiagramManager.sendRequest(request, this.remoteId);
        if (ReplyUpdateDiagramMessage.is(result)) {
            return result.result;
        } else {
            throw new Error("Unexpected message type");
        }
    }

    override async generateTransactionalEdit(action: TransactionalAction): Promise<TransactionalEdit> {
        const request: RequestGenerateTransactionalEditMessage = {
            type: RequestGenerateTransactionalEditMessage.type,
            id: this.id,
            action
        };
        const result = await this.layoutedDiagramManager.sendRequest(request, this.remoteId);
        if (ReplyGenerateTransactionalEditMessage.is(result)) {
            return result.edit;
        } else {
            throw new Error("Unexpected message type");
        }
    }
}
