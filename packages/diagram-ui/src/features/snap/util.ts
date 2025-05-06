import type { CanvasElement, Point, Vector } from "@hylimo/diagram-common";
import { type Matrix, applyToPoint } from "transformation-matrix";
import type { SElement } from "../../model/sElement.js";
import type { InclusiveRange, SnapState } from "./model.js";

/**
 * Due to floating point precision issues, slightly worse snap targets should also be displayed.
 * This is the precision used to determine if two points are close enough to be considered equal.
 * Note that this is only visual, and does not affect the actual snapping.
 */
const SNAPPING_PRECISION = 10 ** -6;

/**
 * Computes the corners of the given element in the target coordinate system.
 *
 * @param elementToTargetMatrix the transformation matrix from the element to the target coordinate system
 * @param element the element to compute the corners for
 * @returns the corners of the element in the target coordinate system
 */
export function getCanvasElementCorners(
    elementToTargetMatrix: Matrix,
    element: Pick<CanvasElement, "width" | "height" | "dx" | "dy">
): [topLeft: Point, topRight: Point, bottomLeft: Point, bottomRight: Point] {
    return [
        applyToPoint(elementToTargetMatrix, { x: element.dx, y: element.dy }),
        applyToPoint(elementToTargetMatrix, { x: element.dx + element.width, y: element.dy }),
        applyToPoint(elementToTargetMatrix, { x: element.dx, y: element.dy + element.height }),
        applyToPoint(elementToTargetMatrix, { x: element.dx + element.width, y: element.dy + element.height })
    ];
}

/**
 * Computes the center point of a canvas element in the target coordinate system.
 *
 * @param elementToTargetMatrix - The transformation matrix from the element's local coordinate system to the target coordinate system.
 * @param element - The canvas element for which the center point is to be calculated.
 * @returns The center point of the canvas element in the target coordinate system.
 */
export function getCanvasElementCenter(elementToTargetMatrix: Matrix, element: SElement & CanvasElement): Point {
    return applyToPoint(elementToTargetMatrix, {
        x: element.dx + element.width / 2,
        y: element.dy + element.height / 2
    });
}

/**
 * Round a number to a fixed number of decimal places.
 *
 * @param x The number to round.
 * @returns The rounded number.
 */
export function round(x: number): number {
    const decimalPlaces = 6;
    return Math.round(x * 10 ** decimalPlaces) / 10 ** decimalPlaces;
}

/**
 * Deduplicates points in an array by their x and y coordinates.
 *
 * @param points The array of points to deduplicate.
 * @returns A new array with unique points.
 */
export function dedupePoints(points: Point[]): Point[] {
    const map = new Map<string, Point>();

    for (const point of points) {
        const key = `${point.x},${point.y}`;

        if (!map.has(key)) {
            map.set(key, point);
        }
    }

    return Array.from(map.values());
}

/**
 * Given two ranges, return if the two ranges overlap with each other e.g.
 * [1, 3] overlaps with [2, 4] while [1, 3] does not overlap with [4, 5].
 *
 * @param param0 One of the ranges to compare
 * @param param1 The other range to compare against
 * @returns TRUE if the ranges overlap
 */
export function rangesOverlap([a0, a1]: InclusiveRange, [b0, b1]: InclusiveRange): boolean {
    if (a0 <= b0) {
        return a1 >= b0;
    }

    if (a0 >= b0) {
        return b1 >= a0;
    }

    return false;
}

/**
 * Given two ranges,return ther intersection of the two ranges if any e.g. the
 * intersection of [1, 3] and [2, 4] is [2, 3].
 *
 * @param param0 The first range to compare
 * @param param1 The second range to compare
 * @returns The inclusive range intersection or NULL if no intersection
 */
export function rangeIntersection([a0, a1]: InclusiveRange, [b0, b1]: InclusiveRange): InclusiveRange | null {
    const rangeStart = Math.max(a0, b0);
    const rangeEnd = Math.min(a1, b1);

    if (rangeStart <= rangeEnd) {
        return [rangeStart, rangeEnd];
    }

    return null;
}

/**
 * Helper function to compute the intersection of two sorted arrays.
 *
 * @param a The first sorted array.
 * @param b The second sorted array.
 * @param compare A comparison function for the elements.
 * @returns The intersection of the two arrays.
 */
export function intersectSortedArrays<T>(a: T[], b: T[], compare: (x: T, y: T) => number): T[] {
    const result: T[] = [];
    let i = 0,
        j = 0;
    while (i < a.length && j < b.length) {
        const comparison = compare(a[i], b[j]);
        if (comparison === 0) {
            result.push(a[i]);
            i++;
            j++;
        } else if (comparison < 0) {
            i++;
        } else {
            j++;
        }
    }
    return result;
}

/**
 * Determines if a snap offset should be added to the X-direction snap collection.
 * Manages the nearest snap tracking state by comparing the current offset against the minimum.
 * If the offset is significantly better than current minimum, it clears existing snaps.
 * If it's close enough to the minimum (within precision), it allows adding multiple snaps.
 * Note that cleanupNearestSnaps() should be called eventually to remove snaps that are too far.
 *
 * @param state The current snap state tracking minimum offsets and snap collections
 * @param offset The offset value to evaluate
 * @returns True if the offset should be added to the snap collection, false otherwise
 */
export function shouldAddSnapX(state: SnapState, offset: number) {
    const absoluteOffset = Math.abs(offset);
    if (absoluteOffset < state.minOffset.x) {
        if (absoluteOffset + SNAPPING_PRECISION < state.minOffset.x) {
            state.nearestSnapsX.length = 0;
        }
        state.minOffset.x = absoluteOffset;
        return true;
    } else if (absoluteOffset - SNAPPING_PRECISION < state.minOffset.x) {
        return true;
    }
    return false;
}

/**
 * Determines if a snap offset should be added to the Y-direction snap collection.
 * Manages the nearest snap tracking state by comparing the current offset against the minimum.
 * If the offset is significantly better than current minimum, it clears existing snaps.
 * If it's close enough to the minimum (within precision), it allows adding multiple snaps.
 * Note that cleanupNearestSnaps() should be called eventually to remove snaps that are too far.
 *
 * @param state The current snap state tracking minimum offsets and snap collections
 * @param offset The offset value to evaluate
 * @returns True if the offset should be added to the snap collection, false otherwise
 */
export function shouldAddSnapY(state: SnapState, offset: number) {
    const absoluteOffset = Math.abs(offset);
    if (absoluteOffset < state.minOffset.y) {
        if (absoluteOffset + SNAPPING_PRECISION < state.minOffset.y) {
            state.nearestSnapsY.length = 0;
        }
        state.minOffset.y = absoluteOffset;
        return true;
    } else if (absoluteOffset - SNAPPING_PRECISION < state.minOffset.y) {
        return true;
    }
    return false;
}

/**
 * Removes snaps from the nearest snap collections that are too far from the minimum offset.
 * This ensures that only snaps within the acceptable precision range are kept.
 * Used to filter out snaps that may have been valid during collection but are now outside
 * the threshold when considering the element's current offset.
 *
 * @param state The snap state containing snap collections to clean up
 * @param elementOffset The current offset of the element being snapped
 */
export function cleanupNearestSnaps(state: SnapState, elementOffset: Vector): void {
    state.nearestSnapsX = state.nearestSnapsX.filter(
        (snap) => snap.offset - elementOffset.x - SNAPPING_PRECISION <= state.minOffset.x
    );
    state.nearestSnapsY = state.nearestSnapsY.filter(
        (snap) => snap.offset - elementOffset.y - SNAPPING_PRECISION <= state.minOffset.y
    );
}
