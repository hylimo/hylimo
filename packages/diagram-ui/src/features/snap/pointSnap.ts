import { Point, type Vector } from "@hylimo/diagram-common";
import { type Matrix, rotateDEG, applyToPoint } from "transformation-matrix";
import {
    type SnapState,
    type SnapOptions,
    SnapType,
    type Snaps,
    type SnapLines,
    type PointSnapLine,
    SnapLineType
} from "./model.js";
import { dedupePoints, round } from "./util.js";

/**
 * Computes the point snaps
 *
 * @param referenceSnapPoints the reference snap points (usually visible, non-selected elements)
 * @param elementSnapPoints the element snap points (usually selected elements)
 * @param elementOffset The offset to apply to the elements being moved
 * @param snapState The current snap state with nearest snaps and minimum offset
 * @param context the context in which the snapping is performed
 * @param options enable/disable snapping in x and y direction
 */
export function getPointSnaps(
    referenceSnapPoints: Point[],
    elementSnapPoints: Point[],
    elementOffset: Vector,
    snapState: SnapState,
    context: string,
    options: SnapOptions
): void {
    const { nearestSnapsX, nearestSnapsY, minOffset } = snapState;
    for (const thisSnapPoint of elementSnapPoints) {
        for (const otherSnapPoint of referenceSnapPoints) {
            const offsetX = otherSnapPoint.x - thisSnapPoint.x;
            const offsetY = otherSnapPoint.y - thisSnapPoint.y;
            const actualOffsetX = offsetX - elementOffset.x;
            const actualOffsetY = offsetY - elementOffset.y;

            if (options.snapX && Math.abs(actualOffsetX) <= minOffset.x) {
                if (Math.abs(actualOffsetX) < minOffset.x) {
                    nearestSnapsX.length = 0;
                }

                nearestSnapsX.push({
                    type: SnapType.POINT,
                    context,
                    point: thisSnapPoint,
                    referencePoint: otherSnapPoint,
                    offset: offsetX
                });

                minOffset.x = Math.abs(actualOffsetX);
            }

            if (options.snapY && Math.abs(actualOffsetY) <= minOffset.y) {
                if (Math.abs(actualOffsetY) < minOffset.y) {
                    nearestSnapsY.length = 0;
                }

                nearestSnapsY.push({
                    type: SnapType.POINT,
                    context,
                    point: thisSnapPoint,
                    referencePoint: otherSnapPoint,
                    offset: offsetY
                });

                minOffset.y = Math.abs(actualOffsetY);
            }
        }
    }
}

/**
 * Creates snap lines from point snaps for rendering.
 * Groups points by context and coordinate to create visual guides.
 *
 * @param nearestSnapsX The nearest snaps in the X direction
 * @param nearestSnapsY The nearest snaps in the Y direction
 * @param transform The transformation matrix to apply to the snap points
 * @param contextGlobalRotations Map of global rotation values for each context
 * @param snapLines The map to populate with snap lines (modified)
 */
export function createPointSnapLines(
    nearestSnapsX: Snaps,
    nearestSnapsY: Snaps,
    transform: Matrix,
    contextGlobalRotations: Map<string, number>,
    snapLines: SnapLines
): void {
    const snapsX = new Map<string, Map<number, Point[]>>();
    const snapsY = new Map<string, Map<number, Point[]>>();

    const addPoints = (snaps: Map<string, Map<number, Point[]>>, context: string, key: number, points: Point[]) => {
        if (!snaps.has(context)) {
            snaps.set(context, new Map<number, Point[]>());
        }
        const contextSnaps = snaps.get(context)!;
        if (!contextSnaps.has(key)) {
            contextSnaps.set(key, []);
        }
        const snapPoints = contextSnaps.get(key)!;
        const rotation = contextGlobalRotations.get(context)!;
        const matrix = rotateDEG(-rotation);
        for (const point of points) {
            snapPoints.push(applyToPoint(matrix, point));
        }
    };

    for (const snap of nearestSnapsX) {
        if (snap.type === SnapType.POINT) {
            const key = round(snap.point.x);
            const transformedPoint = applyToPoint(transform, snap.point);
            addPoints(snapsX, snap.context, key, [
                { x: round(transformedPoint.x), y: round(transformedPoint.y) },
                { x: round(snap.referencePoint.x), y: round(snap.referencePoint.y) }
            ]);
        }
    }

    for (const snap of nearestSnapsY) {
        if (snap.type === SnapType.POINT) {
            const key = round(snap.point.y);
            const transformedPoint = applyToPoint(transform, snap.point);
            addPoints(snapsY, snap.context, key, [
                { x: round(transformedPoint.x), y: round(transformedPoint.y) },
                { x: round(snap.referencePoint.x), y: round(snap.referencePoint.y) }
            ]);
        }
    }

    for (const [context, entries] of snapsX.entries()) {
        if (!snapLines.has(context)) {
            snapLines.set(context, []);
        }
        for (const [, points] of entries.entries()) {
            const snapLine: PointSnapLine = {
                type: SnapLineType.POINTS,
                points: dedupePoints(points.sort(Point.compare))
            };
            snapLines.get(context)!.push(snapLine);
        }
    }
    for (const [context, entries] of snapsY.entries()) {
        if (!snapLines.has(context)) {
            snapLines.set(context, []);
        }
        for (const [, points] of entries.entries()) {
            const snapLine: PointSnapLine = {
                type: SnapLineType.POINTS,
                points: dedupePoints(points.sort(Point.compare))
            };
            snapLines.get(context)!.push(snapLine);
        }
    }
}
