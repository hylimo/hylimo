import type { ActionMessage } from "sprotty-protocol";
import { NotificationType } from "vscode-languageserver-protocol";

/**
 * Namespace for the open diagram notification
 */
export namespace DiagramOpenNotification {
    /**
     * Notification type for open diagram
     */
    export const type = new NotificationType<OpenDiagramMessage>("diagram/open");
}

/**
 * Namespace for the close diagram notification
 */
export namespace DiagramCloseNotification {
    /**
     * Notification type for close diagram
     */
    export const type = new NotificationType<string>("diagram/close");
}

/**
 * Namespace for diagram action messages
 */
export namespace DiagramActionNotification {
    /**
     * Notification type for diagram action messages
     */
    export const type = new NotificationType<ActionMessage>("diagram/action");
}

/**
 * Message for opening a diagram
 * provides a unique client id and a diagram uri which specifies which diagram to open
 */
export interface OpenDiagramMessage {
    /**
     * The unique client id
     */
    clientId: string;
    /**
     * uri of the TextDocument which identifies the diagram
     */
    diagramUri: string;
}
