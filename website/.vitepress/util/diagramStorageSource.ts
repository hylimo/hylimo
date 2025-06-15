import { ref, watch, type Ref } from "vue";
import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { DiagramSource } from "./diagramSource";
import { tryOnMounted, tryOnScopeDispose, useEventListener } from "@vueuse/core";

export interface DiagramMetadata {
    /**
     * The filename of the diagram.
     */
    filename: string;
    /**
     * The last change date of the diagram.
     */
    lastChange: string;
}

interface Diagram {
    filename: string;
    code: string;
}

interface DiagramDBSchema extends DBSchema {
    diagrams: {
        key: string;
        value: Diagram;
    };
    metadata: {
        key: string;
        value: DiagramMetadata;
    };
}

/**
 * Create or open the IndexedDB database.
 *
 * @returns A promise that resolves to the database.
 */
async function getDB(): Promise<IDBPDatabase<DiagramDBSchema>> {
    return openDB<DiagramDBSchema>("diagramDB", 1, {
        upgrade(db) {
            if (!db.objectStoreNames.contains("diagrams")) {
                db.createObjectStore("diagrams", { keyPath: "filename" });
            }
            if (!db.objectStoreNames.contains("metadata")) {
                db.createObjectStore("metadata", { keyPath: "filename" });
            }
        }
    });
}

/**
 * Name of the broadcast channel used to notify changes in the diagrams.
 */
const channelName = "diagramsChange";

export interface DiagramStorage {
    /**
     * The collection of diagram metadata.
     */
    diagrams: Ref<Record<string, DiagramMetadata>>;
    /**
     * Add a new diagram to the storage.
     *
     * @param filename the filename of the diagram
     * @param code initial code of the diagram
     */
    addDiagram: (filename: string, code: string) => Promise<void>;
    /**
     * Remove a diagram from the storage.
     *
     * @param filename the filename of the diagram
     */
    removeDiagram: (filename: string) => Promise<void>;
    /**
     * Open a diagram from the storage.
     *
     * @param filename the filename of the diagram
     * @returns the diagram source
     */
    openDiagram: (filename: string) => Promise<DiagramSource>;
    /**
     * Promise that resolves when the storage is initialized.
     */
    initialized: Promise<void>;
}

/**
 * Hook to manage the storage of diagrams using IndexedDB.
 *
 * @returns An object with the metadata collection, initialization promise, and functions to load, save, add and remove diagrams.
 */
export function useDiagramStorage(): DiagramStorage {
    if (import.meta.env.SSR) {
        return {
            diagrams: ref({}),
            addDiagram: async () => {},
            removeDiagram: async () => {},
            openDiagram: async () => {
                throw new Error("Method not implemented.");
            },
            initialized: Promise.resolve()
        };
    }
    const dbPromise = getDB();
    const diagrams = ref<Record<string, DiagramMetadata>>({});
    const channel = new BroadcastChannel(channelName);

    let resolveInitialized: () => void;
    let rejectInitialized: (reason?: any) => void;
    const initialized = new Promise<void>((resolve, reject) => {
        resolveInitialized = resolve;
        rejectInitialized = reject;
    });

    async function addDiagram(filename: string, code: string) {
        const db = await dbPromise;
        const diagram: Diagram = { filename, code };
        const meta: DiagramMetadata = { filename, lastChange: new Date().toISOString() };
        await db.put("diagrams", diagram);
        await db.put("metadata", meta);
        diagrams.value[filename] = meta;
        channel.postMessage({ added: meta });
    }

    async function removeDiagram(filename: string) {
        const db = await dbPromise;
        await db.delete("diagrams", filename);
        await db.delete("metadata", filename);
        delete diagrams.value[filename];
        channel.postMessage({ removed: filename });
    }

    async function loadMetadata() {
        const db = await dbPromise;
        const allMeta = await db.getAll("metadata");
        diagrams.value = allMeta.reduce(
            (acc, meta) => {
                acc[meta.filename] = meta;
                return acc;
            },
            {} as Record<string, DiagramMetadata>
        );
    }

    async function loadDiagram(filename: string): Promise<string | undefined> {
        const db = await dbPromise;
        return (await db.get("diagrams", filename))?.code;
    }

    async function saveDiagram(filename: string, code: string) {
        const db = await dbPromise;
        const diagram: Diagram = { filename, code };
        const meta: DiagramMetadata = { filename, lastChange: new Date().toISOString() };
        await db.put("diagrams", diagram);
        await db.put("metadata", meta);
        diagrams.value[filename] = meta;
    }

    class DiagramStorageSource implements DiagramSource {
        readonly canSave = ref(undefined);
        readonly type = "browser";
        readonly code: Ref<string>;
        private isSaving: boolean = false;

        constructor(
            readonly filename: string,
            readonly baseName: string,
            code: string
        ) {
            this.code = ref(code);
            watch(this.code, () => {
                this.saveToStorage();
            });
        }

        private async saveToStorage(): Promise<void> {
            if (this.isSaving) {
                return;
            }
            this.isSaving = true;
            const value = this.code.value;
            await saveDiagram(this.filename, value);
            this.isSaving = false;
            if (this.code.value !== value) {
                await this.saveToStorage();
            }
        }

        async save(): Promise<void> {
            throw new Error("Method not implemented 2.");
        }
    }

    async function openDiagram(filename: string): Promise<DiagramSource> {
        return new DiagramStorageSource(filename, filename, (await loadDiagram(filename)) ?? "");
    }

    tryOnMounted(() => {
        useEventListener(channel, "message", loadMetadata);
    });

    tryOnScopeDispose(() => {
        channel.close();
    });

    loadMetadata().then(resolveInitialized!, rejectInitialized!);

    return {
        diagrams,
        addDiagram,
        removeDiagram,
        openDiagram,
        initialized
    };
}
