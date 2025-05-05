import type { Matrix } from "transformation-matrix";
import {
    SnapType,
    type SnapElementData,
    type SnapLine,
    type SnapLines,
    type SnapOptions,
    type SnapReferenceData,
    type SnapResult,
    type SnapState
} from "./model.js";
import { createPointSnapLines, getPointSnaps } from "./pointSnap.js";
import { createGapSnapLines, getGaps, getGapSnaps } from "./gapSnap.js";
import type { Vector } from "@hylimo/diagram-common";
import { createSizeSnapLines, getSizeSnaps } from "./sizeSnap.js";

/**
 * Snap distance for the snapping algorithm
 */
const SNAP_DISTANCE = 8;

/**
 * Calculates snapping information for elements based on reference data.
 *
 * @param state The current state of the elements being moved/snapped
 * @param referenceState Reference data for elements to snap against
 * @param zoom The current zoom level of the viewport
 * @param elementOffset The offset to apply to the elements being moved (applied to the state)
 * @param options Configuration options for the snapping behavior
 * @returns Snap result containing offset and snap lines information
 */
export function getSnaps(
    state: SnapElementData,
    referenceState: SnapReferenceData,
    zoom: number,
    elementOffset: Vector,
    options: SnapOptions
): SnapResult {
    const snapDistance = getSnapDistance(zoom);
    const snapState: SnapState = {
        nearestSnapsX: [],
        nearestSnapsY: [],
        minOffset: {
            x: snapDistance,
            y: snapDistance
        }
    };

    for (const [context, info] of state.entries()) {
        const referenceInfo = referenceState.get(context);
        if (!referenceInfo) {
            continue;
        }
        const visibleGaps = getGaps(referenceInfo.bounds);
        if (options.snapGaps != false && info.bounds != undefined) {
            getGapSnaps(info.bounds, elementOffset, visibleGaps, snapState, context, options);
        }
        if (options.snapPoints) {
            getPointSnaps(referenceInfo.points, info.points, elementOffset, snapState, context, options);
        }
        if (options.snapSize != false && info.bounds != undefined) {
            getSizeSnaps(info.bounds, elementOffset, referenceInfo.bounds, snapState, context, options);
        }
    }
    const contextGlobalRotations = new Map<string, number>();
    for (const [context, info] of referenceState.entries()) {
        contextGlobalRotations.set(context, info.globalRotation);
    }

    return {
        snapOffset: {
            x: snapState.nearestSnapsX[0]?.offset ?? elementOffset.x,
            y: snapState.nearestSnapsY[0]?.offset ?? elementOffset.y
        },
        nearestSnapsX: snapState.nearestSnapsX,
        nearestSnapsY: snapState.nearestSnapsY,
        contextGlobalRotations
    };
}

/**
 * Converts snap results into visual snap lines for rendering.
 *
 * @param snapResult The snap result containing nearest snaps for x and y axes
 * @param transform The transformation matrix to apply to the snap lines
 * @returns Map of snap lines grouped by context ID, or undefined if no snap lines are found
 */
export function getSnapLines(snapResult: SnapResult, transform: Matrix): SnapLines | undefined {
    const { nearestSnapsX, nearestSnapsY } = snapResult;
    const result = new Map<string, SnapLine[]>();
    createPointSnapLines(nearestSnapsX, nearestSnapsY, transform, snapResult.contextGlobalRotations, result);
    createGapSnapLines(
        [...nearestSnapsX, ...nearestSnapsY].filter((snap) => snap.type === SnapType.GAP),
        transform,
        snapResult.contextGlobalRotations,
        result
    );
    createSizeSnapLines(nearestSnapsX, nearestSnapsY, transform, snapResult.contextGlobalRotations, result);
    if (result.size === 0) {
        return undefined;
    }
    return result;
}

/**
 * Snap distance with zoom value taken into consideration
 *
 * @param zoomValue the zoom value of the canvas
 * @returns the snap distance
 */
export function getSnapDistance(zoomValue: number): number {
    return SNAP_DISTANCE / zoomValue;
}
