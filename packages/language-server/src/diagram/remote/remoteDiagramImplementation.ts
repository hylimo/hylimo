import { TransactionalAction } from "@hylimo/diagram-protocol";
import { CompletionItem, Position } from "vscode-languageserver";
import { TransactionalEdit } from "../../edit/edits/transactionalEdit";
import { DiagramImplementation, DiagramUpdateResult } from "../diagramImplementation";
import {
    ReplyGenerateCompletionItemMessage,
    RequestGenerateCompletionItemMessage
} from "./generateCompletionItemsMessage";
import {
    RequestGenerateTransactionalEditMessage,
    ReplyGenerateTransactionalEditMessage
} from "./generateTransactionalEditMessage";
import { RemoteDiagramImplementationManager } from "./remoteDiagramImplementationManager";
import { RequestUpdateDiagramMessage, ReplyUpdateDiagramMessage } from "./updateDiagramMessage";

/**
 * Remote implementation of a diagram.
 * If available, performs the layouted diagram operations on a remote language server.
 */
export class RemoteDiagramImplementation extends DiagramImplementation {
    /**
     * Creates a new RemoteDiagramImplementation.
     *
     * @param layoutedDiagramManager manager by which this is handled
     * @param remoteId the id of the remote language server
     * @param id the id of the diagram
     */
    constructor(
        private readonly layoutedDiagramManager: RemoteDiagramImplementationManager,
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

    override async generateCompletionItems(position: Position): Promise<CompletionItem[] | undefined> {
        const request: RequestGenerateCompletionItemMessage = {
            type: RequestGenerateCompletionItemMessage.type,
            id: this.id,
            position
        };
        const result = await this.layoutedDiagramManager.sendRequest(request, this.remoteId);
        if (ReplyGenerateCompletionItemMessage.is(result)) {
            return result.items;
        } else {
            throw new Error("Unexpected message type");
        }
    }
}
