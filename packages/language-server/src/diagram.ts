import { TextDocument } from "vscode-languageserver-textdocument";
import { CstResult } from "@hylimo/core";
import { LayoutedDiagram } from "@hylimo/diagram";

/**
 * Holds the state for a specific diagram
 */
export class Diagram {
    /**
     * The last parsing result
     */
    lastParserResult?: CstResult;
    /**
     * The layouted diagram
     */
    layoutedDiagram?: LayoutedDiagram;

    /**
     * Creates a new diagram
     *
     * @param document the document on which it is based
     */
    constructor(readonly document: TextDocument) {}
}
