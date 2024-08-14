import { DiagramConfig } from "@hylimo/diagram-common";
import { NotificationType } from "vscode-languageserver-protocol";
import { LanguageServerSettings } from "./settings.js";

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
     * The are permanent values which can be modified by the user
     */
    settings: LanguageServerSettings;
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
