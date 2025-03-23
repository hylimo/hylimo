import type { Ref } from "vue";

/**
 * Source of a diagram that can be displayed in the editor.
 */
export interface DiagramSource {
    /**
     * The name displayed in the file chooser
     */
    filename: string;
    /**
     * The name to use for downloads
     */
    baseName: string;
    /**
     * The code of the diagram, can be updated
     */
    code: Ref<string>;
    /**
     * Whether the diagram can be saved.
     * If undefined, the diagram cannot be saved in general.
     * If false, the diagram maybe can be saved in the future.
     */
    canSave: Ref<boolean | undefined>;
    /**
     * Save the diagram
     */
    save(): Promise<void>;
    /**
     * The type of the source
     */
    type: "browser" | "file";
}
