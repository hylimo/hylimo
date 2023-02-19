import { Element, Root } from "@hylimo/diagram-common";
import { LayoutElement } from "./layoutElement";

/**
 * Defines a rendered diagram with tracing information
 */
export interface DiagramLayoutResult {
    /**
     * The root element of the diagram
     */
    rootElement: Root;
    /**
     * Lookup of id to layouted Element.
     * Contains all elements in rootElement.
     * Useful for prediction.
     */
    elementLookup: Map<string, Element>;
    /**
     * Lookup of id to the LayoutElement containing required tracing information
     */
    layoutElementLookup: Map<string, LayoutElement>;
}
