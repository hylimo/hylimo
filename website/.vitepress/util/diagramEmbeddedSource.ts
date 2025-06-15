import { computed, ref, type Ref } from "vue";
import type { DiagramSource } from "./diagramSource";

export class DiagramEmbeddedSource implements DiagramSource {
    readonly code: Ref<string>;
    readonly savedCode: Ref<string>;
    readonly canSave: Ref<boolean>;
    readonly type = "embedded";

    constructor(
        readonly filename: string,
        readonly baseName: string,
        code: string
    ) {
        this.code = ref(code);
        this.savedCode = ref(code);
        this.canSave = computed(() => this.code.value != this.savedCode.value);
    }

    async save(): Promise<void> {
        window.parent.postMessage(
            {
                type: "saveDiagram",
                filename: this.filename,
                code: this.code.value
            },
            "*"
        );
    }
}
