import type { MoveEdit } from "@hylimo/diagram-protocol";
import { MoveHandler, type HandleMoveResult } from "../../move/moveHandler.js";
import type { Point } from "@hylimo/diagram-common";
import { DefaultEditTypes } from "@hylimo/diagram-common";
import type { Matrix } from "transformation-matrix";
import { applyToPoint, translate } from "transformation-matrix";
import { getSnapLines, getSnaps } from "../../snap/snapping.js";
import { type SnapElementData, type SnapLines } from "../../snap/model.js";
import type { SModelElementImpl } from "sprotty";
import type { SRoot } from "../../../model/sRoot.js";
import { findViewportZoom } from "../../../base/findViewportZoom.js";
import type { SElement } from "../../../model/sElement.js";
import { SnapHandler } from "../../snap/snapHandler.js";
import { getSnapElementData, getSnapReferenceData } from "../../snap/snapData.js";

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
     * @param snapHandler the snap handler to use for snapping, if enabled
     * @param transformationMatrix the transformation matrix to apply to obtain the relative position
     */
    constructor(
        readonly elements: ElementsGroupedByTransformation[],
        readonly snapHandler: TranslationSnapHandler | undefined,
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
        let snapLines: SnapLines | undefined = undefined;
        if (this.snapHandler != undefined) {
            const root = target.root as SRoot;
            this.snapHandler.updateReferenceData(root);
            const zoom = findViewportZoom(root);
            const { snappedDragVector, snapLines: newSnapLines } = this.snapHandler.snap(
                dragVector,
                moveX,
                moveY,
                zoom
            );
            dragVector = snappedDragVector;
            snapLines = newSnapLines;
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

/**
 * Snap handler for translating elements
 */
export class TranslationSnapHandler extends SnapHandler {
    /**
     * Intitial snap element data for a drag vector (0, 0)
     */
    private readonly snapElementData: SnapElementData;

    /**
     * Creates a new create element snap handler
     *
     * @param elements the elements to snap to
     * @param ignoredElements the elements to ignore
     * @param root the root element
     */
    constructor(elements: SElement[], ignoredElements: SElement[], root: SRoot) {
        const ignoredElementsSet = new Set<string>();
        for (const element of ignoredElements) {
            ignoredElementsSet.add(element.id);
        }
        const snapElementData = getSnapElementData(root, elements, ignoredElementsSet);
        super(getSnapReferenceData(root, new Set(snapElementData.keys()), ignoredElementsSet));
        this.snapElementData = snapElementData;
    }

    /**
     * Gets the snapped values and snap lines based on the current translation
     *
     * @param dragVector the current translation
     * @param moveX true if the x coordinate should be snapped
     * @param moveY true if the y coordinate should be snapped
     * @param zoom the current zoom level
     * @returns the snapped values and snap lines
     */
    snap(
        dragVector: Point,
        moveX: boolean,
        moveY: boolean,
        zoom: number
    ): {
        snappedDragVector: Point;
        snapLines: SnapLines | undefined;
    } {
        const snapResult = getSnaps(this.snapElementData, this.referenceData, zoom, dragVector, {
            snapX: moveX,
            snapY: moveY,
            snapGaps: true,
            snapPoints: true,
            snapSize: false
        });
        const snapLines = getSnapLines(snapResult, translate(snapResult.snapOffset.x, snapResult.snapOffset.y));
        return {
            snappedDragVector: snapResult.snapOffset,
            snapLines
        };
    }
}
