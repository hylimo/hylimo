import { type Matrix } from "transformation-matrix";
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
import { Point, type Vector } from "@hylimo/diagram-common";
import { createSizeSnapLines, getSizeSnaps } from "./sizeSnap.js";
import { cleanupNearestSnaps } from "./util.js";
import { filterValidSnapsX, filterValidSnapsY } from "./filterSnaps.js";

/**
 * Snap distance for the snapping algorithm
 */
const SNAP_DISTANCE = 8;

/**
 * Tolerance for snapping to be considered valid
 * This is used to filter out snaps that are too far away from the actual snap point due to rounding.
 */
export const SNAP_TOLERANCE = 2.5;

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
    cleanupNearestSnaps(snapState, elementOffset);
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
        contextGlobalRotations,
        elementOffset
    };
}

/**
 * Due to rounding, actual snap points may sometimes be slightly off.
 * If the distance to the actual snap point is larger than a threshold, snaps are ignored.
 * Modifies the snap result in place.
 *
 * @param snapResult the snap result where snaps are potentially removed
 * @param transform the transform to apply
 * @returns true if the snap result has changed
 */
export function filterValidSnaps(snapResult: SnapResult, transform: Matrix): boolean {
    const validSnapsX = filterValidSnapsX(snapResult.nearestSnapsX, transform);
    const validSnapsY = filterValidSnapsY(snapResult.nearestSnapsY, transform);

    snapResult.nearestSnapsX = validSnapsX;
    snapResult.nearestSnapsY = validSnapsY;
    const newSnapOffset = {
        x: validSnapsX[0]?.offset ?? snapResult.elementOffset.x,
        y: validSnapsY[0]?.offset ?? snapResult.elementOffset.y
    };
    const hasChanged = !Point.equals(newSnapOffset, snapResult.snapOffset);
    snapResult.snapOffset = newSnapOffset;
    return hasChanged;
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
