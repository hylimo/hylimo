import { LayoutedDiagramImplementation } from "../layoutedDiagram";
import { SharedDiagramUtils } from "../sharedDiagramUtils";
import { LocalLayoutedDiagram } from "./localLayoutedDiagram";
import { RegisterRemoteLanguageServerMessage } from "./registerRemoteLanguageServerMessage";
import { RemoteLayoutedDiagram } from "./remoteLayoutedDiagram";
import { LayoutedDiagramManager } from "./layoutedDiagramManager";
import { RemoteMessagePayload } from "./remoteMessages";

/**
 * Manages the layouted diagrams. This is the remote implementation.
 * If no remote language servers are registered, it falls back to the local implementation.
 */
export class RemoteLayoutedDiagramManager extends LayoutedDiagramManager {
    /**
     * Lookup for available remote language servers.
     */
    private readonly remoteLanguageServers = new Map<number, RemoteLanguageServerState>();

    /**
     * Creats a new RemoteLayoutedDiagramManager.
     *
     * @param util required to layout diagrams
     */
    constructor(private readonly utils: SharedDiagramUtils) {
        super(utils.connection, 0);
    }

    override getNewLayoutedDiagramImplementation(
        id: string,
        old?: LayoutedDiagramImplementation
    ): LayoutedDiagramImplementation {
        if (this.remoteLanguageServers.size === 0) {
            return old ?? new LocalLayoutedDiagram(this.utils);
        } else {
            if (old instanceof RemoteLayoutedDiagram) {
                return old;
            }
            let minimumActive = Number.POSITIVE_INFINITY;
            let idealRemoteLanguageServer = -1;
            for (const [id, state] of this.remoteLanguageServers) {
                if (state.activeRequests < minimumActive) {
                    minimumActive = state.activeRequests;
                    idealRemoteLanguageServer = id;
                }
            }
            return new RemoteLayoutedDiagram(this, idealRemoteLanguageServer, id);
        }
    }

    protected override async handleNotification(message: RemoteMessagePayload, from: number): Promise<void> {
        if (RegisterRemoteLanguageServerMessage.is(message)) {
            this.remoteLanguageServers.set(from, {
                id: from,
                activeRequests: 0
            });
        } else {
            throw new Error("Unknown message type");
        }
    }

    protected override handleRequest(_message: RemoteMessagePayload): Promise<RemoteMessagePayload> {
        throw new Error("LayoutedDiagramManager does not handle requests");
    }

    override async sendRequest(payload: RemoteMessagePayload, to: number): Promise<RemoteMessagePayload> {
        const state = this.remoteLanguageServers.get(to);
        if (state != undefined) {
            state.activeRequests++;
            const result = await super.sendRequest(payload, to);
            state.activeRequests--;
            return result;
        } else {
            throw new Error("Unknown remote language server");
        }
    }
}

/**
 * State of a remote language server.
 */
interface RemoteLanguageServerState {
    /**
     * The id of the language server.
     */
    id: number;
    /**
     * The number of active requests, this is used to choose the language server with the
     * lowest number of active requests.
     */
    activeRequests: number;
}
