import type { AxisAlignedSegmentEdit } from "@hylimo/diagram-protocol";
import { DefaultEditTypes } from "@hylimo/diagram-common";
import { applyToPoint, rotateDEG, translate, type Matrix } from "transformation-matrix";
import { MoveHandler, type HandleMoveResult } from "../../move/moveHandler.js";
import type { ResizeMoveCursor } from "../../cursor/cursor.js";
import type { SnapLines } from "../../snap/model.js";
import { SnapHandler } from "../../snap/snapHandler.js";
import type { SRoot } from "../../../model/sRoot.js";
import { getSnapLines, getSnapReferenceData, getSnaps } from "../../snap/snapping.js";
import type { SCanvasConnection } from "../../../model/canvas/sCanvasConnection.js";
import type { SModelElementImpl } from "sprotty";
import { findViewportZoom } from "../../../base/findViewportZoom.js";

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
            const { snappedValue, snapLines: newSnapLines } = this.snapHandler.snap(rawValue, zoom);
            const potentialNewPos = (snappedValue - this.start) / (this.end - this.start);
            if (potentialNewPos >= 0 && potentialNewPos <= 1) {
                newPos = potentialNewPos;
                snapLines = newSnapLines;
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
     * @param start the start coordinate of the segment for the off-axis
     * @param end the end coordinate of the segment for the off-axis
     */
    constructor(
        connection: SCanvasConnection,
        private readonly vertical: boolean,
        private readonly start: number,
        private readonly end: number
    ) {
        const root = connection.root;
        const canvas = connection.parent;

        super(getSnapReferenceData(root, new Set([canvas.id]), new Set()));

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
     * @param value the current position value of the segment being edited
     * @param zoom the current zoom level of the viewport
     * @returns an object containing the snapped value and snap lines to display
     */
    snap(
        value: number,
        zoom: number
    ): {
        snappedValue: number;
        snapLines: SnapLines | undefined;
    } {
        const snapElementData = {
            bounds: undefined,
            points: [
                {
                    x: this.vertical ? value : this.start,
                    y: this.vertical ? this.start : value
                },
                {
                    x: this.vertical ? value : this.end,
                    y: this.vertical ? this.end : value
                }
            ].map((point) => applyToPoint(this.contextToTargetMatrix, point))
        };
        const snapResult = getSnaps(new Map([[this.context, snapElementData]]), this.referenceData, zoom, {
            snapX: this.effectivelyVertical,
            snapY: !this.effectivelyVertical,
            snapGaps: false,
            snapPoints: true
        });
        const convertedSnapOffset = applyToPoint(this.targetToContextMatrix, snapResult.snapOffset);
        const snappedValue = value + (this.vertical ? convertedSnapOffset.x : convertedSnapOffset.y);
        const snapLines = getSnapLines(snapResult, translate(snapResult.snapOffset.x, snapResult.snapOffset.y));
        return {
            snappedValue,
            snapLines
        };
    }
}

/**
 * Creates a snap handler for axis aligned segment edits.
 * This factory function creates a snap handler only if the connection's parent canvas has a rotation that's a multiple of 90 degrees.
 *
 * @param connection the canvas connection containing the segment being edited
 * @param vertical whether the segment being moved is vertical (true) or horizontal (false)
 * @param start the start coordinate of the segment for the off-axis
 * @param end the end coordinate of the segment for the off-axis
 * @returns a new AxisAlignedSegmentEditSnapHandler instance or undefined if the canvas rotation isn't a multiple of 90 degrees
 */
export function createAxisAlignedSegmentEditSnapHandler(
    connection: SCanvasConnection,
    vertical: boolean,
    start: number,
    end: number
): AxisAlignedSegmentEditSnapHandler | undefined {
    const rotation = connection.parent.globalRotation;
    if (rotation % 90 !== 0) {
        return undefined;
    }
    return new AxisAlignedSegmentEditSnapHandler(connection, vertical, start, end);
}
