import { CanvasLayoutEngine as CanvasLayoutEngineBase, Element } from "@hylimo/diagram-common";
import { Layout } from "./layout.js";

/**
 * CanvasLayoutEngine which uses a layout to retrieve elements
 */
export class CanvasLayoutEngine extends CanvasLayoutEngineBase {
    /**
     * Generates a new CanvasLayoutEngine
     *
     * @param layout the layout to use
     */
    constructor(private readonly layout: Layout) {
        super();
    }

    override getElement(id: string): Element {
        return this.layout.elementLookup[id] ?? { id, type: "virtual" };
    }

    override getParentElement(element: string): string {
        const parentId = this.layout.layoutElementLookup.get(element)?.parent?.id;
        if (parentId == undefined) {
            throw new Error(`Element ${element} has no parent`);
        }
        return parentId;
    }
}
