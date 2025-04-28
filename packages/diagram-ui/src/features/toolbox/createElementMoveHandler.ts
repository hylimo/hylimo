import type { ToolboxEdit } from "@hylimo/diagram-protocol";
import { MoveHandler, type HandleMoveResult } from "../move/moveHandler.js";
import type { SRoot } from "../../model/sRoot.js";
import type { SModelElementImpl } from "sprotty";
import type { Action } from "sprotty-protocol";
import {
    getSnapLines,
    getSnapReferenceData,
    getSnaps,
    intersectSnapReferenceDatas,
    type SnapLine,
    type SnapReferenceData
} from "../snap/snapping.js";
import { findViewportZoom } from "../../base/findViewportZoom.js";
import { Math2D } from "@hylimo/diagram-common";
import { translate } from "transformation-matrix";

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
     * @param snapReferenceData the reference data used for snapping, if enabled
     */
    constructor(
        private readonly edit: `toolbox/${string}`,
        private readonly root: SRoot,
        private readonly pointerId: number,
        private snapReferenceData: SnapReferenceData | undefined
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

    override handleMove(x: number, y: number, event: MouseEvent, target: SModelElementImpl): HandleMoveResult {
        let values: { x: number; y: number };
        let snapLines: Map<string, SnapLine[]> | undefined = undefined;
        if (this.hasMoved) {
            values = { x, y };
            if (this.snapReferenceData != undefined) {
                const root = target.root as SRoot;
                const contexts = new Set(this.snapReferenceData.keys());
                const newReferenceData = getSnapReferenceData(root, contexts, new Set());
                this.snapReferenceData = intersectSnapReferenceDatas(this.snapReferenceData, newReferenceData);
                const snapElementData = {
                    bounds: undefined,
                    points: [values]
                };
                const snapResult = getSnaps(
                    new Map([[root.id, snapElementData]]),
                    this.snapReferenceData,
                    findViewportZoom(target),
                    {
                        snapX: true,
                        snapY: true,
                        snapGaps: false,
                        snapPoints: true
                    }
                );
                values = Math2D.add(values, snapResult.snapOffset);
                snapLines = getSnapLines(snapResult, translate(snapResult.snapOffset.x, snapResult.snapOffset.y));
            }
        } else {
            values = {
                x: this.root.scroll.x + this.root.canvasBounds.width / this.root.zoom / 2,
                y: this.root.scroll.y + this.root.canvasBounds.height / this.root.zoom / 2
            };
        }
        const edits = [
            {
                types: [this.edit],
                values,
                elements: [this.root.id]
            } satisfies ToolboxEdit
        ];
        return { edits, snapLines };
    }
}
