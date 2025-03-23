import { computed, ref, type Ref } from "vue";
import type { DiagramSource } from "./diagramSource";

declare global {
    interface LaunchParams {
        files: FileSystemHandle[];
    }

    interface LaunchQueue {
        setConsumer: (callback: (params: LaunchParams) => void) => void;
    }

    interface Window {
        launchQueue: LaunchQueue;
    }
}

/**
 * Tries to open a diagram contained within the browser launch queue.
 *
 * @returns the diagram included in the file handle or undefined if no file was found
 */
export async function openDiagramFromLaunchQueue(): Promise<DiagramSource | undefined> {
    if (!("launchQueue" in window)) {
        return undefined;
    }

    return new Promise((resolve, reject) => {
        window.launchQueue.setConsumer(async ({ files }) => {
            try {
                const diagram = await handleFiles(files);
                resolve(diagram);
            } catch (e) {
                reject(e);
            }
        });
    });
}

/**
 * A diagram source that is backed by a file.
 */
class DiagramFileSource implements DiagramSource {
    readonly code: Ref<string>;
    private readonly savedCode: Ref<string>;
    readonly canSave: Ref<boolean | undefined>;
    readonly type = "file";

    constructor(
        readonly filename: string,
        readonly baseName: string,
        private readonly fileHandle: FileSystemFileHandle,
        code: string
    ) {
        this.code = ref(code);
        this.savedCode = ref(code);
        this.canSave = computed(() => this.code.value !== this.savedCode.value);
    }

    async save(): Promise<void> {
        const writable = await this.fileHandle.createWritable();
        await writable.write(this.code.value);
        await writable.close();
        this.savedCode.value = this.code.value;
    }
}

/**
 * Loads the given diagram from the given file.
 *
 * @param files the files in the launch queue. Should only have a single element.
 * @returns the diagram source to use or undefined if no file was found
 */
async function handleFiles(files: FileSystemHandle[]): Promise<DiagramSource | undefined> {
    if (files.length === 0) {
        return;
    }
    if (files.length > 1) {
        throw new Error(
            "Found multiple diagrams to open simultaneously. Hylimo can only open one diagram at the same time"
        );
    }
    const handle = files[0];
    if (handle.kind !== "file") {
        throw new Error("Hylimo can only open files, not directories");
    }
    const file = handle as FileSystemFileHandle;

    const blob = await file.getFile();
    const text = await blob.text();
    const name = file.name;

    return new DiagramFileSource(name, name.match(/^(.*?)(\.hyl)?$/)?.[1] ?? name, file, text);
}
