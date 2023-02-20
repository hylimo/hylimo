import { Element, Root } from "@hylimo/diagram-common";
import { LayoutElement } from "./layoutElement";

export interface BaseDiagramLayoutResult {
    /**
     * The root element of the diagram
     */
    rootElement: Root;
    /**
     * Lookup of id to layouted Element.
     * Contains all elements in rootElement.
     * Useful for prediction.
     */
    elementLookup: Record<string, Element>;
}

export namespace BaseDiagramLayoutResult {
    export function fromRoot(root: Root): BaseDiagramLayoutResult {
        const elementLookup: Record<string, Element> = {};
        const stack: Element[] = [root];
        while (stack.length > 0) {
            const current = stack.pop();
            if (current == undefined) {
                continue;
            }
            elementLookup[current.id] = current;
            stack.push(...current.children);
        }
        return { rootElement: root, elementLookup };
    }
}

/**
 * Defines a rendered diagram with tracing information
 */
export interface DiagramLayoutResult extends BaseDiagramLayoutResult {
    /**
     * Lookup of id to the LayoutElement containing required tracing information
     */
    layoutElementLookup: Map<string, LayoutElement>;
}
