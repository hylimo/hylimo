import type { BaseLayoutedDiagram } from "@hylimo/diagram-common";
import type { LayoutElement } from "./layoutElement.js";

/**
 * Defines a rendered diagram with tracing information
 */
export interface LayoutedDiagram extends BaseLayoutedDiagram {
    /**
     * Lookup of id to the LayoutElement containing required tracing information
     */
    layoutElementLookup: Map<string, LayoutElement>;
}
