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
 * A code file with a file handle.
 */
export interface CodeWithFileHandle {
    /**
     * The code of the file.
     */
    code: string;
    /**
     * The file handle of the file.
     */
    fileHandle: FileSystemFileHandle;
}

/**
 * Tries to open a diagram contained within the browser launch queue.
 *
 * @returns the diagram included in the file handle or undefined if no file was found
 */
export async function openDiagram(): Promise<CodeWithFileHandle | undefined> {
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
 * Loads the given diagram from the given file.
 *
 * @param files the files in the launch queue. Should only have a single element.
 * @returns the diagram included in the file handle or undefined if no file was found
 */
async function handleFiles(files: FileSystemHandle[]): Promise<CodeWithFileHandle | undefined> {
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
    return { code: text, fileHandle: file };
}
