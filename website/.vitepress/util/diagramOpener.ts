import { serialize } from "./serialization";

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
 */
export function openDiagram() {
    if (!("launchQueue" in window)) return;
    window.launchQueue.setConsumer((params) => handleFiles(params.files));
}

/**
 * Loads the given diagram from the given file.
 *
 * @param files the files in the launch queue. Should only have a single element.
 */
async function handleFiles(files: FileSystemHandle[]) {
    if (files.length === 0) return;
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
    window.location.replace(`/#${serialize(text, "base64")}`);
}
