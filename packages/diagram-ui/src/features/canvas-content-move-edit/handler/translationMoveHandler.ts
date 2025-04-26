import type { MoveEdit } from "@hylimo/diagram-protocol";
import { MoveHandler, type HandleMoveResult } from "../../move/moveHandler.js";
import { DefaultEditTypes, Math2D, Point } from "@hylimo/diagram-common";
import type { Matrix } from "transformation-matrix";
import { applyToPoint, translate } from "transformation-matrix";
import {
    getSnapLines,
    getSnapReferenceData,
    getSnaps,
    intersectSnapReferenceDatas,
    translateSnapData,
    type SnapData,
    type SnapElementData,
    type SnapLine,
    type SnapReferenceData
} from "../../snap/snapping.js";
import type { SModelElementImpl } from "sprotty";
import type { SRoot } from "../../../model/sRoot.js";
import { findViewportZoom } from "../../../base/findViewportZoom.js";
import type { SnapLinesStateManager } from "../../snap/snapLinesStateManager.js";

/**
 * Entry for a translation move operation
 */
export interface ElementsGroupedByTransformation {
    /**
     * The transformation applied to the dx and dy values
     */
    transformation: Matrix;
    /**
     * The elements to move
     */
    elements: string[];
}

/**
 * Move handler for translations of absolute and relative points.
 * Expects relative coordinates in the root canvas coordinate system.
 */
export class TranslationMoveHandler extends MoveHandler {
    /**
     * Creats a new TranslateMovehandler
     *
     * @param elements the ids of the points to move
     * @param snapData the data used for snapping, if enabled
     * @param transformationMatrix the transformation matrix to apply to obtain the relative position
     */
    constructor(
        readonly elements: ElementsGroupedByTransformation[],
        readonly snapData: SnapData | undefined,
        readonly snapLineStateManager: SnapLinesStateManager,
        transformationMatrix: Matrix
    ) {
        super(transformationMatrix, "cursor-move");
    }

    override handleMove(x: number, y: number, event: MouseEvent, target: SModelElementImpl): HandleMoveResult {
        const moveX = !(event.shiftKey && Math.abs(x) < Math.abs(y));
        const moveY = !(event.shiftKey && Math.abs(x) >= Math.abs(y));
        let dragVector: Point = {
            x: moveX ? x : 0,
            y: moveY ? y : 0
        };
        let snapLines: Map<string, SnapLine[]> | undefined = undefined;
        if (this.snapData != undefined) {
            const contexts = new Set(this.snapData.referenceData.keys());
            const newReferenceData = getSnapReferenceData(target.root as SRoot, contexts, new Set());
            this.snapData.referenceData = intersectSnapReferenceDatas(this.snapData.referenceData, newReferenceData);
            const snapResult = getSnaps(
                translateSnapData(this.snapData.data, dragVector),
                this.snapData.referenceData,
                findViewportZoom(target),
                {
                    snapX: moveX,
                    snapY: moveY,
                    snapGaps: true,
                    snapPoints: true
                }
            );
            dragVector = Math2D.add(dragVector, snapResult.snapOffset);
            snapLines = getSnapLines(snapResult, translate(snapResult.snapOffset.x, snapResult.snapOffset.y));
        }
        const edits = this.elements.map(({ elements, transformation }) => {
            const transformed = applyToPoint(transformation, dragVector);
            return {
                types: [DefaultEditTypes.MOVE_X, DefaultEditTypes.MOVE_Y],
                values: { dx: transformed.x, dy: transformed.y },
                elements
            } satisfies MoveEdit;
        });
        return { edits, snapLines };
    }
}
