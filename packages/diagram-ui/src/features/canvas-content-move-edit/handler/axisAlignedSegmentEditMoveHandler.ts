import { SharedSettings, type AxisAlignedSegmentEdit } from "@hylimo/diagram-protocol";
import { DefaultEditTypes } from "@hylimo/diagram-common";
import { applyToPoint, rotateDEG, translate, type Matrix } from "transformation-matrix";
import { MoveHandler, type HandleMoveResult } from "../../move/moveHandler.js";
import type { ResizeMoveCursor } from "../../cursor/cursor.js";
import type { SnapLines } from "../../snap/model.js";
import { SnapHandler } from "../../snap/snapHandler.js";
import type { SRoot } from "../../../model/sRoot.js";
import { getSnapLines, getSnaps, SNAP_TOLERANCE } from "../../snap/snapping.js";
import type { SCanvasConnection } from "../../../model/canvas/sCanvasConnection.js";
import type { SModelElementImpl } from "sprotty";
import { findViewportZoom } from "../../../base/findViewportZoom.js";
import { getSnapReferenceData } from "../../snap/snapData.js";

/**
 * Represents the result of a snap operation for an axis-aligned segment.
 * Contains information about the snapped position and any snap lines that should be displayed.
 */
interface AxisAlignedSegmentSnapResult {
    /**
     * The position value after snapping, normalized between 0 and 1
     */
    snappedPos: number;

    /**
     * Visual snap lines to display in the UI, if any
     */
    snapLines: SnapLines | undefined;
}

/**
 * Move handler for moving the vertical segment of an axis aligned connection segment.
 * Expects relative coordinates in the canvas connection parent canvas coordinate system.
 */
export class AxisAlignedSegmentEditMoveHandler extends MoveHandler {
    /**
     * Creates a new AxisAlignedSegmentEditHandler
     *
     * @param element the id of the CanvasAxisAlignedConnectionSegment to move
     * @param original the original verticalPos/horizontalPos of the segment
     * @param start the x/y cooridnate of the start of the whole axis aligned segment
     * @param end the x/y cooridnate of the end of the whole axis aligned segment
     * @param vertical true if the vertical segment is moved, otherwise false
     * @param snapHandler the snap handler to use for snapping functionality, if enabled
     * @param transformationMatrix transformation matrix to apply to obtain the relative position
     * @param moveCursor the cursor to use while moving
     */
    constructor(
        readonly element: string,
        readonly original: number,
        readonly start: number,
        readonly end: number,
        readonly vertical: boolean,
        readonly snapHandler: AxisAlignedSegmentEditSnapHandler | undefined,
        transformationMatrix: Matrix,
        moveCursor: ResizeMoveCursor | undefined
    ) {
        super(transformationMatrix, moveCursor);
    }

    override handleMove(x: number, y: number, event: MouseEvent, target: SModelElementImpl): HandleMoveResult {
        const rawValue = this.original + (this.vertical ? x : y);
        const rawPos = (rawValue - this.start) / (this.end - this.start);
        let newPos = Math.min(1, Math.max(0, rawPos));
        let snapLines: SnapLines | undefined = undefined;
        if (this.snapHandler != undefined) {
            const root = target.root as SRoot;
            const zoom = findViewportZoom(root);
            this.snapHandler.updateReferenceData(root);
            const snapResult = this.snapHandler.snap(newPos, this.start, this.end, zoom);
            if (snapResult != undefined) {
                newPos = snapResult.snappedPos;
                snapLines = snapResult.snapLines;
            }
        }
        const edits = [
            {
                types: [DefaultEditTypes.AXIS_ALIGNED_SEGMENT_POS],
                values: {
                    pos: this.vertical ? newPos : newPos - 1
                },
                elements: [this.element]
            } satisfies AxisAlignedSegmentEdit
        ];
        return { edits, snapLines };
    }
}

/**
 * Snap handler for axis aligned segment edits.
 * Handles snapping functionality when moving axis aligned segments in a connection.
 */
export class AxisAlignedSegmentEditSnapHandler extends SnapHandler {
    /**
     * Canvas id that serves as the context for snapping operations
     */
    private readonly context: string;

    /**
     * Transformation matrix to convert from context coordinates to target coordinates
     */
    private readonly contextToTargetMatrix: Matrix;

    /**
     * Transformation matrix to convert from target coordinates to context coordinates
     */
    private readonly targetToContextMatrix: Matrix;

    /**
     * Whether the segment is effectively vertical after considering rotations
     */
    private readonly effectivelyVertical: boolean;

    /**
     * Creates a new AxisAlignedSegmentEditSnapHandler
     *
     * @param connection the canvas connection containing the segment being edited
     * @param vertical whether the segment being moved is vertical (true) or horizontal (false)
     * @param otherStart the start coordinate of the segment for the off-axis
     * @param otherEnd the end coordinate of the segment for the off-axis
     */
    constructor(
        connection: SCanvasConnection,
        private readonly vertical: boolean,
        private readonly otherStart: number,
        private readonly otherEnd: number,
        settings: SharedSettings | undefined
    ) {
        const root = connection.root;
        const canvas = connection.parent;

        super(getSnapReferenceData(root, new Set([canvas.id]), new Set()), settings);

        this.context = canvas.id;
        this.contextToTargetMatrix = rotateDEG(canvas.globalRotation);
        this.targetToContextMatrix = rotateDEG(-canvas.globalRotation);
        if (canvas.globalRotation % 180 === 0) {
            this.effectivelyVertical = vertical;
        } else {
            this.effectivelyVertical = !vertical;
        }
    }

    /**
     * Gets the snapped value and associated snap lines based on the current position
     *
     * @param pos the current position value of the segment being edited
     * @param start the x/y cooridnate of the start of the whole axis aligned segment
     * @param end the x/y cooridnate of the end of the whole axis aligned segment
     * @param zoom the current zoom level of the viewport
     * @returns an object containing the snapped pos and snap lines to display
     */
    snap(pos: number, start: number, end: number, zoom: number): AxisAlignedSegmentSnapResult | undefined {
        const value = SharedSettings.roundToAxisAlignedPosPrecision(this.settings, pos) * (end - start) + start;
        const snapResult = this.getSnapResult(value, zoom);

        const convertedSnapOffset = applyToPoint(this.targetToContextMatrix, snapResult.snapOffset);
        const snappedValue = this.vertical ? convertedSnapOffset.x : convertedSnapOffset.y;

        const potentialNewPos = (snappedValue - start) / (end - start);
        if (potentialNewPos < 0 && potentialNewPos > 1) {
            return undefined;
        }
        const roundedPos = SharedSettings.roundToAxisAlignedPosPrecision(this.settings, potentialNewPos);
        const rounedValue = roundedPos * (end - start) + start;
        if (Math.abs(rounedValue - snappedValue) >= SNAP_TOLERANCE) {
            return undefined;
        }

        const snapLines = getSnapLines(snapResult, translate(snapResult.snapOffset.x, snapResult.snapOffset.y));

        return {
            snappedPos: roundedPos,
            snapLines
        };
    }

    /**
     * Gets snap result data based on the current value
     *
     * @param value the current position value of the segment being edited
     * @param zoom the current zoom level of the viewport
     * @returns the snap result data
     */
    private getSnapResult(value: number, zoom: number) {
        const snapElementData = {
            bounds: undefined,
            points: [
                {
                    x: this.vertical ? 0 : this.otherStart,
                    y: this.vertical ? this.otherStart : 0
                },
                {
                    x: this.vertical ? 0 : this.otherEnd,
                    y: this.vertical ? this.otherEnd : 0
                }
            ].map((point) => applyToPoint(this.contextToTargetMatrix, point))
        };
        const offset = applyToPoint(this.contextToTargetMatrix, {
            x: this.vertical ? value : 0,
            y: this.vertical ? 0 : value
        });
        return getSnaps(new Map([[this.context, snapElementData]]), this.referenceData, zoom, offset, {
            snapX: this.effectivelyVertical,
            snapY: !this.effectivelyVertical,
            snapGaps: false,
            snapPoints: true,
            snapSize: false
        });
    }
}

/**
 * Creates a snap handler for axis aligned segment edits.
 * This factory function creates a snap handler only if the connection's parent canvas has a rotation that's a multiple of 90 degrees.
 *
 * @param connection the canvas connection containing the segment being edited
 * @param vertical whether the segment being moved is vertical (true) or horizontal (false)
 * @param otherStart the start coordinate of the segment for the off-axis
 * @param otherEnd the end coordinate of the segment for the off-axis
 * @returns a new AxisAlignedSegmentEditSnapHandler instance or undefined if the canvas rotation isn't a multiple of 90 degrees
 */
export function createAxisAlignedSegmentEditSnapHandler(
    connection: SCanvasConnection,
    vertical: boolean,
    otherStart: number,
    otherEnd: number,
    settings: SharedSettings | undefined
): AxisAlignedSegmentEditSnapHandler | undefined {
    const rotation = connection.parent.globalRotation;
    if (rotation % 90 !== 0) {
        return undefined;
    }
    return new AxisAlignedSegmentEditSnapHandler(connection, vertical, otherStart, otherEnd, settings);
}
