import { DiagramConfig } from "@hylimo/diagram-common";
import { NotificationType } from "vscode-languageserver-protocol";

/**
 * Configuration for a diagram language server
 */
export interface LanuageServerConfig {
    /**
     * The configuration for the diagram itself
     */
    diagramConfig: DiagramConfig;
}

/**
 * Namespace for the configuration notification
 */
export namespace ConfigNotification {
    /**
     * Notification type for sending a new configuration to the language server
     */
    export const type = new NotificationType<LanuageServerConfig>("diagram/config");
}
