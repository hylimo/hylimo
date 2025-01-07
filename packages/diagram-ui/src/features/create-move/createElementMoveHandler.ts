import { Edit, ToolboxEdit } from "@hylimo/diagram-protocol";
import { CreateMoveHandler } from "./createMoveHandler.js";
import { SRoot } from "../../model/sRoot.js";

/**
 * Create move handler to create canvas elements, typically used for toolbox edits
 */
export class CreateElementMoveHandler extends CreateMoveHandler {
    /**
     * If true, the mouse has been moved
     */
    private hasMoved = false;

    /**
     * Creates a new create element move handler
     *
     * @param edit the edit to perform
     * @param root the root element
     */
    constructor(
        private readonly edit: `toolbox/${string}`,
        private readonly root: SRoot
    ) {
        super();
    }

    override generateEdit(x: number, y: number, committed: boolean): Edit {
        if (!committed) {
            this.hasMoved = true;
        }
        let values: { x: number; y: number };
        if (this.hasMoved) {
            values = { x, y };
        } else {
            values = {
                x: this.root.scroll.x + this.root.canvasBounds.width / this.root.zoom / 2,
                y: this.root.scroll.y + this.root.canvasBounds.height / this.root.zoom / 2
            };
        }
        return {
            types: [this.edit],
            values,
            elements: [this.root.id]
        } satisfies ToolboxEdit;
    }
}
