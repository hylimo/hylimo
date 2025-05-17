import type { DiagramConfig } from "@hylimo/diagram-common";
import type { SharedSettings } from "@hylimo/diagram-protocol";
import { type DynamicLanguageServerConfig, type EditorConfig } from "@hylimo/diagram-protocol";

/**
 * Dynamic configuration for a diagram language server
 */
export class Config implements DynamicLanguageServerConfig {
    /**
     * The configuration for the diagram itself
     */
    readonly diagramConfig: DiagramConfig;
    /**
     * The settings for the language server
     * The are permanent values which can be modified by the user
     */
    readonly settings: SharedSettings;
    /**
     * The configuration for the graphical editor
     */
    readonly editorConfig: EditorConfig;

    /**
     * Creates a new Config object based on the given configuration
     *
     * @param config the configuration to use
     */
    constructor(config: DynamicLanguageServerConfig) {
        this.settings = config.settings;
        this.diagramConfig = config.diagramConfig;
        this.editorConfig = config.editorConfig;
    }
}
