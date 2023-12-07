import { Element } from "../model/elements/base/element";
import { Root } from "../model/elements/root";

export interface BaseLayoutedDiagram {
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

export namespace BaseLayoutedDiagram {
    export function fromRoot(root: Root): BaseLayoutedDiagram {
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