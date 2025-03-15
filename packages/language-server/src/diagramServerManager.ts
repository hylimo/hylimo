import type { Root } from "@hylimo/diagram-common";
import type { ActionMessage, GeneratorArguments, SModelRoot } from "sprotty-protocol";
import type { Connection } from "vscode-languageserver";
import type { Diagram } from "./diagram/diagram.js";
import { DiagramServer } from "./edit/diagramServer.js";
import type { IncrementalUpdate, EditorConfig, DynamicLanguageServerConfig } from "@hylimo/diagram-protocol";
import {
    IncrementalUpdateAction,
    DiagramActionNotification,
    EditorConfigUpdatedAction
} from "@hylimo/diagram-protocol";

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
     * @param editorConfig the current editor config
     */
    addClient(clientId: string, diagram: Diagram, editorConfig: EditorConfig): void {
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
        this.sendConfigToDiagramServer(diagramServer, editorConfig);
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
     * Called to update the editor config of each DiagramServer
     *
     * @param config the new config
     */
    onDidChangeConfig(config: DynamicLanguageServerConfig): void {
        for (const diagramServer of this.diagramServers.values()) {
            this.sendConfigToDiagramServer(diagramServer, config.editorConfig);
        }
    }

    /**
     * Sends the config to the diagram server
     *
     * @param diagramServer the diagram server to send the config to
     * @param config the config to send
     */
    private sendConfigToDiagramServer(diagramServer: DiagramServer, config: EditorConfig): void {
        const action: EditorConfigUpdatedAction = {
            kind: EditorConfigUpdatedAction.KIND,
            config
        };
        diagramServer.dispatch(action);
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
            throw new Error(`Unknown client for message: ${JSON.stringify(message)}`);
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
