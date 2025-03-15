import type { DocumentUri, Range } from "vscode-languageserver-protocol";
import { NotificationType } from "vscode-languageserver-protocol";

/**
 * Namespace for the publish document reveal notification
 */
export namespace PublishDocumentRevealNotification {
    /**
     * Notification type for publish document reveal
     */
    export const type = new NotificationType<PublishDocumentRevealParams>("textDocument/publishDocumentReveal");
}

/**
 * The parameters send in a publish document reveal notification
 */
export interface PublishDocumentRevealParams {
    /**
     * The document uri.
     */
    uri: DocumentUri;

    /**
     * An array of document reveals for the given text document.
     */
    range: Range;
}
