import { Connection } from "vscode-languageserver";
import { LayoutedDiagramImplementation } from "../layoutedDiagram";
import { RemoteMessagePayload, RemoteNotification, RemoteRequest } from "./remoteMessages";

export abstract class LayoutedDiagramManager {
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

    protected abstract handleNotification(message: RemoteMessagePayload, from: number): Promise<void>;

    protected abstract handleRequest(message: RemoteMessagePayload, from: number): Promise<RemoteMessagePayload>;

    abstract getNewLayoutedDiagramImplementation(
        id: string,
        old?: LayoutedDiagramImplementation
    ): LayoutedDiagramImplementation;

    async sendNotification(payload: RemoteMessagePayload, to: number): Promise<void> {
        return this.connection.sendNotification(RemoteNotification.type, {
            from: this.id,
            to,
            payload
        });
    }

    async sendRequest(payload: RemoteMessagePayload, to: number): Promise<RemoteMessagePayload> {
        const result = await this.connection.sendRequest(RemoteRequest.type, {
            from: this.id,
            to,
            payload
        });
        return result.payload;
    }
}
