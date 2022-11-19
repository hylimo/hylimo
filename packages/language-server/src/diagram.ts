import { TextDocument } from "vscode-languageserver-textdocument";
import { CstResult } from "@hylimo/core";

/**
 * Holds the state for a specific diagram
 */
export class Diagram {
    /**
     * The last parsing result
     */
    lastParserResult?: CstResult;

    /**
     * Creates a new diagram
     *
     * @param document the document on which it is based
     */
    constructor(readonly document: TextDocument) {}
}
