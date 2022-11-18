import { TextDocument } from "vscode-languageserver-textdocument";

/**
 * Holds the state for a specific diagram
 */
export class Diagram {
    /**
     * Creates a new diagram
     *
     * @param document the document on which it is based
     */
    constructor(readonly document: TextDocument) {}
}
