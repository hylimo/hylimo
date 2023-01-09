import { Root } from "@hylimo/diagram-common";
import { LayoutElement } from "./layoutElement";

/**
 * Defines a rendered diagram with tracing information
 */
export interface LayoutedDiagram {
    /**
     * The root element of the diagram
     */
    rootElement: Root;
    /**
     * Lookup of id to the LayoutElement containing required tracing information
     */
    layoutElementLookup: Map<string, LayoutElement>;
}
