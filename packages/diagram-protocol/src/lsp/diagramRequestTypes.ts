import { BaseLayoutedDiagram } from "@hylimo/diagram-common";
import { RequestType } from "vscode-languageserver-protocol";

export namespace DiagramRequest {
    export const type = new RequestType<DiagramRequestMessage, DiagramRequestMessage, any>("diagram/request");
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

export interface DiagramResponseMessage {
    diagram?: BaseLayoutedDiagram;
}