import { DiagramImplementation } from "../diagramImplementation";
import { SharedDiagramUtils } from "../../sharedDiagramUtils";
import { DiagramImplementationManager } from "../diagramImplementationManager";
import {
    RequestGenerateTransactionalEditMessage,
    ReplyGenerateTransactionalEditMessage
} from "../remote/generateTransactionalEditMessage";
import { RegisterRemoteLanguageServerMessage } from "../remote/registerRemoteLanguageServerMessage";
import { RemoteMessagePayload } from "@hylimo/diagram-protocol";
import { RequestUpdateDiagramMessage, ReplyUpdateDiagramMessage } from "../remote/updateDiagramMessage";
import { LocalDiagramImplementation } from "./localDiagramImplementation";
import {
    ReplyGenerateCompletionItemMessage,
    RequestGenerateCompletionItemMessage
} from "../remote/generateCompletionItemsMessage";
import { ReplyGetSourceRangeMessage, RequestGetSourceRangeMessage } from "../remote/getSourceRangeMessage";

/**
 * Manages the layouted diagrams. This is the local implementation.
 * It does not send any messages to other language servers.
 */
export class LocalDiagramImplementationManager extends DiagramImplementationManager {
    /**
     * Lookup for created layouted diagram implementations
     */
    private readonly implementations = new Map<string, DiagramImplementation>();

    /**
     * Creates a new LocalLayoutedDiagramManager.
     *
     * @param utils required to layout diagrams
     * @param id the id of this language server
     */
    constructor(private readonly utils: SharedDiagramUtils, id: number) {
        super(utils.connection, id);
        const registerMessage: RegisterRemoteLanguageServerMessage = {
            type: RegisterRemoteLanguageServerMessage.type
        };
        this.sendNotification(registerMessage, 0);
    }

    protected override async handleNotification(_message: RemoteMessagePayload, _from: number): Promise<void> {
        throw new Error("LocalLayoutedDiagramManager does not handle notifications");
    }

    protected override async handleRequest(
        message: RemoteMessagePayload,
        _from: number
    ): Promise<RemoteMessagePayload> {
        if (RequestUpdateDiagramMessage.is(message)) {
            return this.handleUpdateDiagramRequest(message);
        } else if (RequestGenerateTransactionalEditMessage.is(message)) {
            return this.handleGenerateTransactionalEditRequest(message);
        } else if (RequestGenerateCompletionItemMessage.is(message)) {
            return this.handleGenerateCompletionItemsRequest(message);
        } else if (RequestGetSourceRangeMessage.is(message)) {
            return this.handleGetSourceRangeRequest(message);
        } else {
            throw new Error("Unexpected message type: " + message.type);
        }
    }

    /**
     * Handles a request to generate a TransactionalEdit.
     *
     * @param message the message requesting the TransactionalEdit
     * @returns the response message payload
     */
    private async handleGenerateTransactionalEditRequest(
        message: RequestGenerateTransactionalEditMessage
    ): Promise<ReplyGenerateTransactionalEditMessage> {
        const implementation = this.getNewDiagramImplementation(message.id);
        const result: ReplyGenerateTransactionalEditMessage = {
            type: ReplyGenerateTransactionalEditMessage.type,
            edit: await implementation.generateTransactionalEdit(message.action)
        };
        return result;
    }

    /**
     * Handles a request to update a diagram.
     *
     * @param message the message requesting the update
     * @returns the response message payload
     */
    private async handleUpdateDiagramRequest(message: RequestUpdateDiagramMessage): Promise<ReplyUpdateDiagramMessage> {
        const implementation = this.getNewDiagramImplementation(message.id);
        const updateDiagramResult = await implementation.updateDiagram(message.source, message.config);
        const rootElement = updateDiagramResult.rootElement;
        const result: ReplyUpdateDiagramMessage = {
            type: ReplyUpdateDiagramMessage.type,
            result: {
                diagnostics: updateDiagramResult.diagnostics,
                rootElement
            }
        };
        return result;
    }

    /**
     * Handles a request to generate completion items.
     *
     * @param message the message requesting the completion items
     * @returns the response message payload
     */
    private async handleGenerateCompletionItemsRequest(
        message: RequestGenerateCompletionItemMessage
    ): Promise<ReplyGenerateCompletionItemMessage> {
        const implementation = this.getNewDiagramImplementation(message.id);
        const result: ReplyGenerateCompletionItemMessage = {
            type: ReplyGenerateCompletionItemMessage.type,
            items: await implementation.generateCompletionItems(message.source, message.config, message.position)
        };
        return result;
    }

    /**
     * Handles a request to get the source range of an element.
     *
     * @param message the message requesting the source range
     * @returns the response message payload
     */
    private async handleGetSourceRangeRequest(
        message: RequestGetSourceRangeMessage
    ): Promise<ReplyGetSourceRangeMessage> {
        const implementation = this.getNewDiagramImplementation(message.id);
        const result: ReplyGetSourceRangeMessage = {
            type: ReplyGetSourceRangeMessage.type,
            range: await implementation.getSourceRange(message.element)
        };
        return result;
    }

    override getNewDiagramImplementation(id: string, old?: DiagramImplementation | undefined): DiagramImplementation {
        if (old != undefined) {
            return old;
        } else {
            if (this.implementations.has(id)) {
                return this.implementations.get(id)!;
            } else {
                const newImplementation = new LocalDiagramImplementation(this.utils);
                this.implementations.set(id, newImplementation);
                return newImplementation;
            }
        }
    }
}
