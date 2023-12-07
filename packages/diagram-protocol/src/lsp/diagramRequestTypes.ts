import { BaseLayoutedDiagram } from "@hylimo/diagram-common";
import { RequestType } from "vscode-languageserver-protocol";

/**
 * Namespace for the diagram request
 */
export namespace DiagramRequest {
    /**
     * Request type for diagram request
     */
    export const type = new RequestType<DiagramRequestMessage, DiagramResponseMessage, any>("diagram/request");
}

/**
 * Message for requesting a diagram
 */
export interface DiagramRequestMessage {
    /**
     * The unique client id
     */
    diagramUri: string;
}

/**
 * Message for responding to a diagram request
 */
export interface DiagramResponseMessage {
    /**
     * The found diagram
     */
    diagram?: BaseLayoutedDiagram;
}
