import type { Edit, ToolboxEdit } from "@hylimo/diagram-protocol";
import { MoveHandler } from "../move/moveHandler.js";
import type { SRoot } from "../../model/sRoot.js";
import type { SModelElementImpl } from "sprotty";
import type { Action } from "sprotty-protocol";

/**
 * Create move handler to create canvas elements, typically used for toolbox edits
 */
export class CreateElementMoveHandler extends MoveHandler {
    /**
     * Creates a new create element move handler
     *
     * @param edit the edit to perform
     * @param root the root element
     * @param pointerId the pointer id, used to set pointer capture
     */
    constructor(
        private readonly edit: `toolbox/${string}`,
        private readonly root: SRoot,
        private readonly pointerId: number
    ) {
        super(root.getMouseTransformationMatrix(), undefined, false);
    }

    override generateActions(
        target: SModelElementImpl,
        event: MouseEvent,
        committed: boolean,
        transactionId: string,
        sequenceNumber: number
    ): Action[] {
        if (!this.hasMoved && !committed) {
            (event.target as HTMLElement | undefined)?.setPointerCapture(this.pointerId);
        }
        return super.generateActions(target, event, committed, transactionId, sequenceNumber);
    }

    override generateEdits(x: number, y: number): Edit[] {
        let values: { x: number; y: number };
        if (this.hasMoved) {
            values = { x, y };
        } else {
            values = {
                x: this.root.scroll.x + this.root.canvasBounds.width / this.root.zoom / 2,
                y: this.root.scroll.y + this.root.canvasBounds.height / this.root.zoom / 2
            };
        }
        return [
            {
                types: [this.edit],
                values,
                elements: [this.root.id]
            } satisfies ToolboxEdit
        ];
    }
}
