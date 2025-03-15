import type { DiagramConfig } from "@hylimo/diagram-common";
import { NotificationType } from "vscode-languageserver-protocol";
import type { LanguageServerSettings } from "./settings.js";
import type { EditorConfig } from "../diagram/editor-config/editorConfig.js";

/**
 * Configuration for a diagram language server
 */
export interface DynamicLanguageServerConfig {
    /**
     * The configuration for the diagram itself
     */
    diagramConfig: DiagramConfig;
    /**
     * The settings for the language server
     * These are permanent values which can be modified by the user
     */
    settings: LanguageServerSettings;
    /**
     * The configuration for the graphical editor
     */
    editorConfig: EditorConfig;
}

/**
 * Namespace for the configuration notification
 */
export namespace ConfigNotification {
    /**
     * Notification type for sending a new configuration to the language server
     */
    export const type = new NotificationType<DynamicLanguageServerConfig>("diagram/config");
}

/**
 * Namespace for the update editor config notification
 */
export namespace UpdateEditorConfigNotification {
    /**
     * Notification type that the editor configuration should be updated
     */
    export const type = new NotificationType<EditorConfig>("diagram/updateEditorConfig");
}
