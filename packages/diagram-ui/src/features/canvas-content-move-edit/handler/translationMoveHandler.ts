import { SharedSettings, type MoveEdit } from "@hylimo/diagram-protocol";
import { type HandleMoveResult } from "../../move/moveHandler.js";
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
import { SnapMoveHandler } from "../../snap/snapMoveHandler.js";

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
    /**
     * If the x coordinate should be modified
     */
    moveX: boolean;
    /**
     * If the y coordinate should be modified
     */
    moveY: boolean;
}

/**
 * Move handler for translations of absolute and relative points.
 * Expects relative coordinates in the root canvas coordinate system.
 */
export class TranslationMoveHandler extends SnapMoveHandler<TranslationSnapHandler> {
    /**
     * True if the x coordinate should be snapped
     */
    readonly snapX: boolean;
    /**
     * True if the y coordinate should be snapped
     */
    readonly snapY: boolean;

    /**
     * Creates a new TranslationMoveHandler
     *
     * @param elementsByTransformation the ids of the points to move grouped by transformation
     * @param elements the elements to consider for snapping
     * @param ignoredElements the elements to ignore for snapping
     * @param root the root element containing the diagram
     * @param settings shared settings for the diagram
     * @param snappingEnabled whether snapping is enabled
     * @param transformationMatrix the transformation matrix to apply to obtain the relative position
     */
    constructor(
        private readonly elementsByTransformation: ElementsGroupedByTransformation[],
        elements: SElement[],
        ignoredElements: Set<string>,
        root: SRoot,
        settings: SharedSettings | undefined,
        snappingEnabled: boolean,
        transformationMatrix: Matrix
    ) {
        const snapHandler = new TranslationSnapHandler(elements, ignoredElements, root, settings);
        super(snapHandler, snappingEnabled, transformationMatrix, "cursor-move");

        if (elementsByTransformation.some(({ moveX, moveY }) => moveX && moveY)) {
            this.snapX = true;
            this.snapY = true;
        } else {
            const effectiveRotations = new Set<number>();
            for (const { globalRotation, moveX, moveY } of elementsByTransformation) {
                if (moveX) {
                    effectiveRotations.add(globalRotation % 360);
                }
                if (moveY) {
                    effectiveRotations.add((globalRotation + 90) % 360);
                }
            }
            if (effectiveRotations.size === 1) {
                const rotation = effectiveRotations.values().next().value;
                this.snapX = rotation === 0 || rotation === 180;
                this.snapY = rotation === 90 || rotation === 270;
            } else {
                this.snapX = true;
                this.snapY = true;
            }
        }
    }

    override handleMove(x: number, y: number, event: MouseEvent, target: SModelElementImpl): HandleMoveResult {
        let snapX: boolean;
        let snapY: boolean;
        let dragVector: Vector;
        if (this.snapX && this.snapY) {
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
        if (this.isSnappingEnabled(event)) {
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
        const edits = this.elementsByTransformation.map(({ elements, transformation, moveX, moveY }) => {
            const transformed = applyToPoint(transformation, dragVector);
            const types: MoveEdit["types"] = [];
            if (moveX) {
                types.push(DefaultEditTypes.MOVE_X);
            }
            if (moveY) {
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
class TranslationSnapHandler extends SnapHandler {
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
     * @param settings the shared settings for snap data computation
     */
    constructor(elements: SElement[], ignoredElements: Set<string>, root: SRoot, settings: SharedSettings | undefined) {
        const snapElementData = getSnapElementData(root, elements, ignoredElements);
        super(getSnapReferenceData(root, new Set(snapElementData.keys()), ignoredElements), settings);
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
