import { SharedSettings, type ToolboxEdit } from "@hylimo/diagram-protocol";
import { type HandleMoveResult } from "../move/moveHandler.js";
import type { SRoot } from "../../model/sRoot.js";
import type { SModelElementImpl } from "sprotty";
import type { Action } from "sprotty-protocol";
import { filterValidSnaps, getSnapLines, getSnaps } from "../snap/snapping.js";
import { type SnapLine } from "../snap/model.js";
import { findViewportZoom } from "../../base/findViewportZoom.js";
import type { Point } from "@hylimo/diagram-common";
import { translate, type Matrix } from "transformation-matrix";
import { SnapHandler } from "../snap/snapHandler.js";
import { getSnapReferenceData } from "../snap/snapData.js";
import { SnapMoveHandler } from "../snap/snapMoveHandler.js";

/**
 * Create move handler to create canvas elements, typically used for toolbox edits
 */
export class CreateElementMoveHandler extends SnapMoveHandler<CreateElementSnapHandler> {
    /**
     * Creates a new create element move handler
     *
     * @param edit the edit to perform
     * @param root the root element
     * @param editTarget the id of the target element to edit
     * @param pointerId the pointer id, used to set pointer capture
     * @param snapHandler the snap handler to use for snapping, if enabled
     * @param settings the shared settings
     * @param snappingEnabled whether snapping is enabled
     */
    constructor(
        private readonly edit: `toolbox/${string}`,
        private readonly root: SRoot,
        private readonly editTarget: string,
        private readonly pointerId: number,
        settings: SharedSettings | undefined,
        snappingEnabled: boolean
    ) {
        const snapHandler = new CreateElementSnapHandler(root, settings);
        super(snapHandler, snappingEnabled, root.getMouseTransformationMatrix(), undefined, false);
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
            if (this.isSnappingEnabled(event)) {
                const root = target.root as SRoot;
                this.snapHandler.updateReferenceData(root);
                const zoom = findViewportZoom(root);
                const { snappedValues, snapLines: newSnapLines } = this.snapHandler.snap(values, zoom);
                values = snappedValues;
                snapLines = newSnapLines;
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
                elements: [this.editTarget]
            } satisfies ToolboxEdit
        ];
        return { edits, snapLines };
    }
}

/**
 * Snap handler for creating new elements
 */
class CreateElementSnapHandler extends SnapHandler {
    /**
     * The context of the snap handler, the id of the root element
     */
    private readonly context: string;

    /**
     * Creates a new create element snap handler
     *
     * @param root the root element
     * @param settings the shared settings
     */
    constructor(root: SRoot, settings: SharedSettings | undefined) {
        super(getSnapReferenceData(root, new Set([root.id]), new Set()), settings);
        this.context = root.id;
    }

    /**
     * Gets the snapped values and snap lines based on the current translation
     *
     * @param values the current translation
     * @param zoom the current zoom level
     * @returns the snapped values and snap lines
     */
    snap(
        values: Point,
        zoom: number
    ): {
        snappedValues: Point;
        snapLines: Map<string, SnapLine[]> | undefined;
    } {
        const snapElementData = {
            bounds: undefined,
            points: [{ x: 0, y: 0 }]
        };
        const snapResult = getSnaps(
            new Map([[this.context, snapElementData]]),
            this.referenceData,
            zoom,
            this.roundToTranslationPrecision(values),
            {
                snapX: true,
                snapY: true,
                snapGaps: false,
                snapPoints: true,
                snapSize: false
            }
        );
        filterValidSnaps(snapResult, this.createRoundedTranslation(snapResult.snapOffset));
        const snapLines = getSnapLines(snapResult, this.createRoundedTranslation(snapResult.snapOffset));
        return {
            snappedValues: snapResult.snapOffset,
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
