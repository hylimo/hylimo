import { Connection } from "vscode-languageserver";
import { LayoutedDiagramImplementation } from "../layoutedDiagram";
import { RemoteMessagePayload, RemoteNotification, RemoteRequest } from "./remoteMessages";

/**
 * Manages the layouted diagrams. Base class for the remote and local implementation.
 */
export abstract class LayoutedDiagramManager {
    /**
     * Creates a new LayoutedDiagramManager.
     * Listens to remote notifications and requests on the given connection.
     *
     * @param connection the connection to sent and receive messages
     * @param id the id of this language server
     */
    constructor(private readonly connection: Connection, private readonly id: number) {
        connection.onNotification(RemoteNotification.type, (message) => {
            this.handleNotification(message.payload, message.from);
        });
        connection.onRequest(RemoteRequest.type, async (message) => {
            const payload = await this.handleRequest(message.payload, message.from);
            return {
                from: message.to,
                to: message.from,
                payload
            };
        });
    }

    /**
     * Handles a remote notification.
     *
     * @param message the message to handle
     * @param from the id of the sender language server
     */
    protected abstract handleNotification(message: RemoteMessagePayload, from: number): Promise<void>;

    /**
     * Handles a remote request.
     *
     * @param message the request to handle
     * @param from the id of the sender language server
     * @returns the response to send back
     */
    protected abstract handleRequest(message: RemoteMessagePayload, from: number): Promise<RemoteMessagePayload>;

    /**
     * Gets a layouted diagram implementation for the given id.
     * May return the same instance as the old parameter.
     *
     * @param id the id of the diagram
     * @param old the old layouted diagram implementation
     * @returns the new layouted diagram implementation
     */
    abstract getNewLayoutedDiagramImplementation(
        id: string,
        old?: LayoutedDiagramImplementation
    ): LayoutedDiagramImplementation;

    /**
     * Sends a remote notification.
     *
     * @param payload the payload to send
     * @param to the id of the receiver language server
     */
    async sendNotification(payload: RemoteMessagePayload, to: number): Promise<void> {
        return this.connection.sendNotification(RemoteNotification.type, {
            from: this.id,
            to,
            payload
        });
    }

    /**
     * Sends a remote request.
     *
     * @param payload the payload to send
     * @param to the id of the receiver language server
     * @returns the response sent by the receiver
     */
    async sendRequest(payload: RemoteMessagePayload, to: number): Promise<RemoteMessagePayload> {
        const result = await this.connection.sendRequest(RemoteRequest.type, {
            from: this.id,
            to,
            payload
        });
        return result.payload;
    }
}
