import { CanvasLayoutEngine, CanvasPoint, CanvasElement, CanvasConnection, Element } from "@hylimo/diagram-common";
import { SCanvas } from "./sCanvas.js";
import { SCanvasConnection } from "./sCanvasConnection.js";
import { SCanvasElement } from "./sCanvasElement.js";
import { SCanvasPoint } from "./sCanvasPoint.js";
import { SRoot } from "../sRoot.js";
import { SElement } from "../sElement.js";

/**
 * CanvasLayoutEngine implementation for SCanvas
 */
export class SCanvasLayoutEngine extends CanvasLayoutEngine {
    
    /**
     * Creates a new SCanvasLayoutEngine based on a root element
     *
     * @param root the root element providing the index
     */
    constructor(private readonly root: SRoot) {
        super();
    }

    override getElement(id: string): Element {
        return this.root.index.getById(id) as SElement;
    }
    
    override getParentElement(element: string): string {
        return (this.root.index.getById(element) as SElement).parent.id;
    }
    
}
