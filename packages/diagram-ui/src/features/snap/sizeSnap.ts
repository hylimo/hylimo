import type { Bounds, Vector } from "@hylimo/diagram-common";
import {
    SnapLineType,
    SnapType,
    type InclusiveRange,
    type PointPair,
    type SizeSnapLine,
    type SizeSnapOptions,
    type SnapLines,
    type SnapOptions,
    type Snaps,
    type SnapState
} from "./model.js";
import { rangesOverlap, round, shouldAddSnapX, shouldAddSnapY } from "./util.js";
import { applyToPoint, rotateDEG, type Matrix } from "transformation-matrix";

/**
 * Processes size snapping for an element against target bounds.
 * Finds matching size elements and updates the snap state accordingly.
 *
 * @param elementBounds the bounds of the element being snapped
 * @param elementOffset the offset to apply to the elements being moved
 * @param targetBoundsArray of potential target bounds to snap to
 * @param snapStateCurrent snap state to update
 * @param contextSnap context identifier
 * @param optionsSnap configuration options
 */
export function getSizeSnaps(
    elementBounds: Bounds,
    elementOffset: Vector,
    targetBounds: Bounds[],
    snapState: SnapState,
    context: string,
    options: SnapOptions
): void {
    const minX = round(elementBounds.position.x);
    const minY = round(elementBounds.position.y);
    const maxX = round(elementBounds.position.x + elementBounds.size.width);
    const maxY = round(elementBounds.position.y + elementBounds.size.height);
    const rangeX = [minX + elementOffset.x, maxX + elementOffset.x] satisfies InclusiveRange;
    const rangeY = [minY + elementOffset.y, maxY + elementOffset.y] satisfies InclusiveRange;
    const relevantTargetBounds = targetBounds.filter(
        (targetBounds) =>
            rangesOverlap([targetBounds.position.x, targetBounds.position.x + targetBounds.size.width], rangeX) ||
            rangesOverlap([targetBounds.position.y, targetBounds.position.y + targetBounds.size.height], rangeY)
    );

    if (options.snapX) {
        handleHorizontalSizeSnap(elementBounds, elementOffset, relevantTargetBounds, snapState, context, options);
    }

    if (options.snapY) {
        handleVerticalSizeSnap(elementBounds, elementOffset, relevantTargetBounds, snapState, context, options);
    }
}

/**
 * Handles horizontal (width) size snapping logic.
 *
 * @param elementBounds the bounds of the element being snapped
 * @param elementOffset the offset to apply to the elements being moved
 * @param relevantTargetBoundsFiltered array of potential target bounds
 * @param snapStateCurrent snap state to update
 * @param contextSnap context identifier
 * @param optionsSnap configuration options
 */
function handleHorizontalSizeSnap(
    elementBounds: Bounds,
    elementOffset: Vector,
    relevantTargetBounds: Bounds[],
    snapState: SnapState,
    context: string,
    options: SnapOptions
): void {
    const factor = (options.snapSize as SizeSnapOptions).horizontal;
    for (const targetBounds of relevantTargetBounds) {
        const diff = (elementBounds.size.width - targetBounds.size.width) * factor;
        if (shouldAddSnapX(snapState, diff)) {
            snapState.nearestSnapsX.push({
                type: SnapType.SIZE,
                context,
                offset: elementOffset.x + diff,
                targetBounds,
                bounds: elementBounds
            });
        }
    }
}

/**
 * Handles vertical (height) size snapping logic.
 *
 * @param elementBounds the bounds of the element being snapped
 * @param elementOffset the offset to apply to the elements being moved
 * @param relevantTargetBoundsFiltered array of potential target bounds
 * @param snapStateCurrent snap state to update
 * @param contextSnap context identifier
 * @param optionsSnap configuration options
 */
function handleVerticalSizeSnap(
    elementBounds: Bounds,
    elementOffset: Vector,
    relevantTargetBounds: Bounds[],
    snapState: SnapState,
    context: string,
    options: SnapOptions
): void {
    const factor = (options.snapSize as SizeSnapOptions).vertical;
    for (const targetBounds of relevantTargetBounds) {
        const diff = (elementBounds.size.height - targetBounds.size.height) * factor;
        if (shouldAddSnapY(snapState, diff)) {
            snapState.nearestSnapsY.push({
                type: SnapType.SIZE,
                context,
                offset: elementOffset.y + diff,
                targetBounds,
                bounds: elementBounds
            });
        }
    }
}

/**
 * Creates visual snap lines for size-based snaps.
 * Processes horizontal and vertical snaps separately and generates
 * appropriate visual indicators.
 *
 * @param nearestSnapsXCollection of horizontal snaps
 * @param nearestSnapsYCollection of vertical snaps
 * @param transformTransformation matrix to apply to points
 * @param contextGlobalRotationsMap of rotation values by context
 * @param snapLinesMap to store the resulting snap lines by context
 */
export function createSizeSnapLines(
    nearestSnapsX: Snaps,
    nearestSnapsY: Snaps,
    transform: Matrix,
    contextGlobalRotations: Map<string, number>,
    snapLines: SnapLines
): void {
    const sizeSnapLinesByContext = new Map<string, SizeSnapLine[]>();

    createHorizontalSizeSnapLines(nearestSnapsX, transform, sizeSnapLinesByContext);
    createVerticalSizeSnapLines(nearestSnapsY, transform, sizeSnapLinesByContext);

    for (const [context, sizeSnapLines] of sizeSnapLinesByContext.entries()) {
        if (!snapLines.has(context)) {
            snapLines.set(context, []);
        }
        const existingSnapLines = snapLines.get(context)!;
        const rotation = contextGlobalRotations.get(context)!;
        const matrix = rotateDEG(-rotation);
        existingSnapLines.push(
            ...dedupeSizeSnapLines(
                sizeSnapLines.map((line) => ({
                    ...line,
                    points: line.points.map((point) => applyToPoint(matrix, point)) as PointPair
                }))
            )
        );
    }
}

/**
 * Creates horizontal size snap lines based on width snapping.
 *
 * @param nearestSnapsXCollection of horizontal snaps
 * @param transformTransformation matrix to apply to points
 * @param sizeSnapLinesByContextMap to store the resulting snap lines by context
 */
function createHorizontalSizeSnapLines(
    nearestSnapsX: Snaps,
    transform: Matrix,
    sizeSnapLinesByContext: Map<string, SizeSnapLine[]>
): void {
    for (const snap of nearestSnapsX) {
        if (snap.type !== SnapType.SIZE) {
            continue;
        }
        const context = snap.context;
        const targetBounds = snap.targetBounds;
        const bounds = snap.bounds;
        if (!sizeSnapLinesByContext.has(context)) {
            sizeSnapLinesByContext.set(context, []);
        }
        const sizeSnapLines = sizeSnapLinesByContext.get(context)!;
        sizeSnapLines.push({
            type: SnapLineType.SIZE,
            points: [
                { x: round(bounds.position.x), y: round(bounds.position.y + bounds.size.height / 2) },
                {
                    x: round(bounds.position.x + bounds.size.width),
                    y: round(bounds.position.y + bounds.size.height / 2)
                }
            ].map((point) => applyToPoint(transform, point)) as PointPair
        });
        sizeSnapLines.push({
            type: SnapLineType.SIZE,
            points: [
                { x: round(targetBounds.position.x), y: round(targetBounds.position.y + targetBounds.size.height / 2) },
                {
                    x: round(targetBounds.position.x + targetBounds.size.width),
                    y: round(targetBounds.position.y + targetBounds.size.height / 2)
                }
            ]
        });
    }
}

/**
 * Creates vertical size snap lines based on height snapping.
 *
 * @param nearestSnapsYCollection of vertical snaps
 * @param transformTransformation matrix to apply to points
 * @param sizeSnapLinesByContextMap to store the resulting snap lines by context
 */
function createVerticalSizeSnapLines(
    nearestSnapsY: Snaps,
    transform: Matrix,
    sizeSnapLinesByContext: Map<string, SizeSnapLine[]>
): void {
    for (const snap of nearestSnapsY) {
        if (snap.type !== SnapType.SIZE) {
            continue;
        }
        const context = snap.context;
        const targetBounds = snap.targetBounds;
        const bounds = snap.bounds;
        if (!sizeSnapLinesByContext.has(context)) {
            sizeSnapLinesByContext.set(context, []);
        }
        const sizeSnapLines = sizeSnapLinesByContext.get(context)!;
        sizeSnapLines.push({
            type: SnapLineType.SIZE,
            points: [
                { x: round(bounds.position.x + bounds.size.width / 2), y: round(bounds.position.y) },
                {
                    x: round(bounds.position.x + bounds.size.width / 2),
                    y: round(bounds.position.y + bounds.size.height)
                }
            ].map((point) => applyToPoint(transform, point)) as PointPair
        });
        sizeSnapLines.push({
            type: SnapLineType.SIZE,
            points: [
                { x: round(targetBounds.position.x + targetBounds.size.width / 2), y: round(targetBounds.position.y) },
                {
                    x: round(targetBounds.position.x + targetBounds.size.width / 2),
                    y: round(targetBounds.position.y + targetBounds.size.height)
                }
            ]
        });
    }
}

/**
 * Removes duplicate snap lines by creating a unique key for each line.
 *
 * @param sizeSnapLinesArray of size snap lines that might contain duplicates
 * @returns Array of unique size snap lines
 */
function dedupeSizeSnapLines(sizeSnapLines: SizeSnapLine[]): SizeSnapLine[] {
    const map = new Map<string, SizeSnapLine>();

    for (const line of sizeSnapLines) {
        const key = line.points.flatMap((point) => [round(point.x), round(point.y)]).join(",");

        if (!map.has(key)) {
            map.set(key, line);
        }
    }

    return Array.from(map.values());
}
