import { SharedSettings, type MoveEdit } from "@hylimo/diagram-protocol";
import { MoveHandler, type HandleMoveResult } from "../../move/moveHandler.js";
import type { Point, Vector } from "@hylimo/diagram-common";
import { DefaultEditTypes } from "@hylimo/diagram-common";
import type { Matrix } from "transformation-matrix";
import { applyToPoint, translate } from "transformation-matrix";
import { filterValidSnaps, getSnapLines, getSnaps } from "../../snap/snapping.js";
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
     * The global rotaiton of the context
     */
    globalRotation: number;
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
     * True if the x coordinate should be snapped
     */
    readonly snapX: boolean;
    /**
     * True if the y coordinate should be snapped
     */
    readonly snapY: boolean;

    /**
     * Creats a new TranslateMovehandler
     *
     * @param elements the ids of the points to move
     * @param snapHandler the snap handler to use for snapping, if enabled
     * @param moveX if true, the x coordinate can be modified
     * @param moveY if true, the y coordinate can be modified
     * @param transformationMatrix the transformation matrix to apply to obtain the relative position
     */
    constructor(
        readonly elements: ElementsGroupedByTransformation[],
        readonly snapHandler: TranslationSnapHandler | undefined,
        readonly moveX: boolean,
        readonly moveY: boolean,
        transformationMatrix: Matrix
    ) {
        super(transformationMatrix, "cursor-move");
        if (moveX && moveY) {
            this.snapX = true;
            this.snapY = true;
        } else {
            const effectiveRotations = elements.map(({ globalRotation }) => globalRotation / 90);
            const regular = effectiveRotations.every((rotation) => rotation % 2 === 0);
            const rotated = effectiveRotations.every((rotation) => rotation % 2 === 1);
            this.snapX = (moveX && regular) || (moveY && rotated);
            this.snapY = (moveY && regular) || (moveX && rotated);
        }
    }

    override handleMove(x: number, y: number, event: MouseEvent, target: SModelElementImpl): HandleMoveResult {
        let snapX: boolean;
        let snapY: boolean;
        let dragVector: Vector;
        if (this.moveX && this.moveY) {
            snapX = !(event.shiftKey && Math.abs(x) < Math.abs(y));
            snapY = !(event.shiftKey && Math.abs(x) >= Math.abs(y));
            dragVector = {
                x: snapX ? x : 0,
                y: snapY ? y : 0
            };
        } else {
            snapX = this.snapX;
            snapY = this.snapY;
            dragVector = {
                x,
                y
            };
        }
        let snapLines: SnapLines | undefined = undefined;
        if (this.snapHandler != undefined) {
            const root = target.root as SRoot;
            this.snapHandler.updateReferenceData(root);
            const zoom = findViewportZoom(root);
            const { snappedDragVector, snapLines: newSnapLines } = this.snapHandler.snap(
                dragVector,
                snapX,
                snapY,
                zoom
            );
            dragVector = snappedDragVector;
            snapLines = newSnapLines;
        }
        const edits = this.elements.map(({ elements, transformation }) => {
            const transformed = applyToPoint(transformation, dragVector);
            const types: MoveEdit["types"] = [];
            if (this.moveX) {
                types.push(DefaultEditTypes.MOVE_X);
            }
            if (this.moveY) {
                types.push(DefaultEditTypes.MOVE_Y);
            }
            return {
                types,
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
    constructor(elements: SElement[], ignoredElements: SElement[], root: SRoot, settings: SharedSettings | undefined) {
        const ignoredElementsSet = new Set<string>();
        for (const element of ignoredElements) {
            ignoredElementsSet.add(element.id);
        }
        const snapElementData = getSnapElementData(root, elements, ignoredElementsSet);
        super(getSnapReferenceData(root, new Set(snapElementData.keys()), ignoredElementsSet), settings);
        this.snapElementData = snapElementData;
    }

    /**
     * Gets the snapped values and snap lines based on the current translation
     *
     * @param dragVector the current translation
     * @param snapX true if the x coordinate should be snapped
     * @param snapY true if the y coordinate should be snapped
     * @param zoom the current zoom level
     * @returns the snapped values and snap lines
     */
    snap(
        dragVector: Point,
        snapX: boolean,
        snapY: boolean,
        zoom: number
    ): {
        snappedDragVector: Point;
        snapLines: SnapLines | undefined;
    } {
        const snapResult = getSnaps(
            this.snapElementData,
            this.referenceData,
            zoom,
            this.roundToTranslationPrecision(dragVector),
            {
                snapX,
                snapY,
                snapGaps: true,
                snapPoints: true,
                snapSize: false
            }
        );
        filterValidSnaps(snapResult, this.createRoundedTranslation(snapResult.snapOffset));
        const snapLines = getSnapLines(snapResult, this.createRoundedTranslation(snapResult.snapOffset));
        return {
            snappedDragVector: snapResult.snapOffset,
            snapLines
        };
    }

    /**
     * Creates a translation matrix with rounded coordinates
     *
     * @param point the point to translate by after rounding
     * @returns a translation matrix with the rounded coordinates
     */
    private createRoundedTranslation(point: Point): Matrix {
        const roundedPoint = this.roundToTranslationPrecision(point);
        return translate(roundedPoint.x, roundedPoint.y);
    }

    /**
     * Rounds the coordinates of a point to the translation precision specified in the settings.
     * This ensures consistent precision when elements are moved or created on the canvas.
     *
     * @param point The point whose coordinates need to be rounded
     * @returns A new point with coordinates rounded according to translation precision settings
     */
    private roundToTranslationPrecision(point: Point): Point {
        return {
            x: SharedSettings.roundToTranslationPrecision(this.settings, point.x),
            y: SharedSettings.roundToTranslationPrecision(this.settings, point.y)
        };
    }
}
