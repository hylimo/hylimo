import { CompletionItem, Position, Range } from "vscode-languageserver";
import { DiagramImplementation, DiagramUpdateResult } from "../diagramImplementation.js";
import {
    ReplyGenerateCompletionItemMessage,
    RequestGenerateCompletionItemMessage
} from "./generateCompletionItemsMessage.js";
import { RemoteDiagramImplementationManager } from "./remoteDiagramImplementationManager.js";
import { RequestUpdateDiagramMessage, ReplyUpdateDiagramMessage } from "./updateDiagramMessage.js";
import { DiagramConfig } from "@hylimo/diagram-common";
import { ReplyGetSourceRangeMessage, RequestGetSourceRangeMessage } from "./getSourceRangeMessage.js";

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

    override async updateDiagram(source: string, config: DiagramConfig): Promise<DiagramUpdateResult> {
        const request: RequestUpdateDiagramMessage = {
            type: RequestUpdateDiagramMessage.type,
            id: this.id,
            source,
            config
        };
        const result = await this.layoutedDiagramManager.sendRequest(request, this.remoteId);
        if (ReplyUpdateDiagramMessage.is(result)) {
            return result.result;
        } else {
            throw new Error(
                `Unexpected message type: expected: ${ReplyUpdateDiagramMessage.type}, actual: ${result.type}`
            );
        }
    }

    override async generateCompletionItems(
        source: string,
        config: DiagramConfig,
        position: Position
    ): Promise<CompletionItem[] | undefined> {
        const request: RequestGenerateCompletionItemMessage = {
            type: RequestGenerateCompletionItemMessage.type,
            id: this.id,
            position,
            source,
            config
        };
        const result = await this.layoutedDiagramManager.sendRequest(request, this.remoteId);
        if (ReplyGenerateCompletionItemMessage.is(result)) {
            return result.items;
        } else {
            throw new Error(
                `Unexpected message type: expected: ${ReplyGenerateCompletionItemMessage.type}, actual: ${result.type}`
            );
        }
    }

    override async getSourceRange(element: string): Promise<Range | undefined> {
        const request: RequestGetSourceRangeMessage = {
            type: RequestGetSourceRangeMessage.type,
            id: this.id,
            element
        };
        const result = await this.layoutedDiagramManager.sendRequest(request, this.remoteId);
        if (ReplyGetSourceRangeMessage.is(result)) {
            return result.range;
        } else {
            throw new Error(
                `Unexpected message type: expected: ${ReplyGetSourceRangeMessage.type}, actual: ${result.type}`
            );
        }
    }
}
