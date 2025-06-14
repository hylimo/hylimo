import { computed, ref, type Ref } from "vue";
import type { DiagramSource } from "./diagramSource";

export class DiagramEmbeddedSource implements DiagramSource {
    readonly filename: string;
    readonly baseName: string;
    readonly code: Ref<string>;
    savedCode: Ref<string>;
    canSave: Ref<boolean>;
    type: "browser" | "file";

    constructor(filename: string, baseName: string, code: string) {
        this.filename = filename;
        this.baseName = baseName;
        this.code = ref(code);
        this.savedCode = ref(code);
        this.canSave = computed(() => this.code.value != this.savedCode.value);
        this.type = "file";
    }

    async save(): Promise<void> {
        window.parent.postMessage({
            type: "saveDiagram",
            filename: this.filename,
            code: this.code.value
        }, "*");
    }
}