import { IncrementalUpdate, IncrementalUpdateAction, Root } from "@hylimo/diagram-common";
import { ActionMessage, GeneratorArguments, SModelRoot } from "sprotty-protocol";
import { Connection } from "vscode-languageserver";
import { Diagram } from "./diagram/diagram";
import { DiagramActionNotification } from "./diagramNotificationTypes";
import { DiagramServer } from "./edit/diagramServer";

/**
 * Manages DiagramServer instances and associates them with TextDocuments
 * Handles removing of clients automatically, however addings must be done manually as the Diagram
 * must be provided.
 */
export class DiagramServerManager {
    /**
     * Diagram servers by client id
     */
    private readonly diagramServers = new Map<string, DiagramServer>();

    /**
     * Lookup from TextDocument uri to array of client ids
     */
    private readonly diagramServersByDocument = new Map<string, string[]>();

    /**
     * Gets the document uri associated with the client
     */
    private readonly documentLookup = new Map<string, string>();

    /**
     * Creates a new DiagramServerManager based on the provided connetion
     *
     * @param connection handles LSP communication
     */
    constructor(private readonly connection: Connection) {}

    /**
     * Adds a new client with the diagram to serve
     *
     * @param clientId the unique id of the client, throws an error if already known
     * @param diagram the diagram to serve
     */
    addClient(clientId: string, diagram: Diagram): void {
        if (this.diagramServers.has(clientId)) {
            throw new Error(`ClientId ${clientId} already has a diagram server`);
        }
        const uri = diagram.document.uri;
        if (!this.diagramServersByDocument.has(uri)) {
            this.diagramServersByDocument.set(uri, []);
        }
        const diagramServer = new DiagramServer(
            (action) => {
                return this.connection.sendNotification<ActionMessage>(DiagramActionNotification.type, {
                    clientId,
                    action
                });
            },
            {
                DiagramGenerator: {
                    generate(args: GeneratorArguments): SModelRoot {
                        return args.state.currentRoot;
                    }
                }
            },
            diagram
        );

        this.diagramServers.set(clientId, diagramServer);
        this.diagramServersByDocument.get(uri)?.push(clientId);
        this.documentLookup.set(clientId, uri);
        if (diagram.currentDiagram) {
            diagramServer.state.currentRoot = diagram.currentDiagram.rootElement;
        }
    }

    /**
     * Updates the model of each DiagramServer associated with diagram
     *
     * @param id the id of the diagram
     * @param newRoot the new root of the diagram
     */
    updatedDiagram(id: string, newRoot: Root): void {
        (this.diagramServersByDocument.get(id) ?? [])
            .map((clientId) => this.diagramServers.get(clientId)!)
            .forEach((diagramServer) => {
                diagramServer.updateModel(newRoot);
            });
    }

    /**
     * Incrementally updates the model of each DiagramServer associated with diagram based on the provided updates
     *
     * @param id the id of the diagram
     * @param updates the updates to apply
     * @param sequenceNumber the sequence number of the update
     */
    incrementalUpdateDiagram(id: string, updates: IncrementalUpdate[], sequenceNumber: number): void {
        const action: IncrementalUpdateAction = {
            kind: IncrementalUpdateAction.KIND,
            updates,
            sequenceNumber
        };
        (this.diagramServersByDocument.get(id) ?? [])
            .map((clientId) => this.diagramServers.get(clientId)!)
            .forEach((diagramServer) => {
                diagramServer.dispatch(action);
            });
    }

    /**
     * Handles a received ActionMessage
     *
     * @param message the received ActionMessage
     * @returns the result optained from the diagram server
     */
    async acceptAction(message: ActionMessage): Promise<void> {
        const diagramServer = this.diagramServers.get(message.clientId);
        if (!diagramServer) {
            throw new Error(`Unknown client: ${message.clientId}`);
        }
        return diagramServer.accept(message.action);
    }

    /**
     * Removes a client with a specified id
     *
     * @param clientId the id of the client to remove
     */
    removeClient(clientId: string): void {
        const uri = this.documentLookup.get(clientId);
        if (uri != undefined) {
            this.documentLookup.delete(clientId);
            this.diagramServersByDocument.set(
                uri,
                this.diagramServersByDocument.get(uri)?.filter((client) => client != clientId) ?? []
            );
        }
        this.diagramServers.delete(clientId);
    }
}
