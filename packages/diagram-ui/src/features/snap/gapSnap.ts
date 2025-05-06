import type { Bounds, Vector } from "@hylimo/diagram-common";
import { type Matrix, applyToPoint, rotateDEG } from "transformation-matrix";
import {
    GapSnapDirection,
    SnapDirection,
    type Gaps,
    type Gap,
    type SnapState,
    type SnapOptions,
    type GapSnapOptions,
    type GapSnap,
    SnapType,
    type SnapLines,
    type GapSnapLine,
    type InclusiveRange,
    type PointPair,
    SnapLineType
} from "./model.js";
import { rangesOverlap, rangeIntersection, round, shouldAddSnapX, shouldAddSnapY } from "./util.js";

/**
 * do not comput more gaps per axis than this limit
 */
const VISIBLE_GAPS_LIMIT_PER_AXIS = 99999;

/**
 * Computes the gaps between elements
 * Used in {@code getGapSnaps}
 *
 * @param referenceBounds the bounds of elements to compute gaps for (usually visible, non-selected elements)
 * @returns the gaps between elements
 */
export function getGaps(referenceBounds: Bounds[]): Gaps {
    return {
        horizontalGaps: getHorizontalGaps(referenceBounds),
        verticalGaps: getVerticalGaps(referenceBounds)
    };
}

/**
 * Computes the horizontal gaps between elements
 *
 * @param referenceBounds the bounds of elements to compute gaps for
 * @returns the horizontal gaps between elements
 */
function getHorizontalGaps(referenceBounds: Bounds[]): Gap[] {
    const horizontallySorted = referenceBounds.sort((a, b) => a.position.x - b.position.x);
    const horizontalGaps: Gap[] = [];

    for (let i = 0; i < horizontallySorted.length; i++) {
        const startBounds = horizontallySorted[i];

        for (let j = i + 1; j < horizontallySorted.length; j++) {
            if (horizontalGaps.length >= VISIBLE_GAPS_LIMIT_PER_AXIS) {
                return horizontalGaps;
            }

            const endBounds = horizontallySorted[j];
            const startMinY = startBounds.position.y;
            const startMaxY = startMinY + startBounds.size.height;
            const startMaxX = startBounds.position.x + startBounds.size.width;
            const endMinX = endBounds.position.x;
            const endMinY = endBounds.position.y;
            const endMaxY = endMinY + endBounds.size.height;

            if (startMaxX < endMinX && rangesOverlap([startMinY, startMaxY], [endMinY, endMaxY])) {
                horizontalGaps.push({
                    startBounds,
                    endBounds,
                    startSide: [
                        { x: startMaxX, y: startMinY },
                        { x: startMaxX, y: startMaxY }
                    ],
                    endSide: [
                        { x: endMinX, y: endMinY },
                        { x: endMinX, y: endMaxY }
                    ],
                    length: endMinX - startMaxX,
                    overlap: rangeIntersection([startMinY, startMaxY], [endMinY, endMaxY])!
                });
            }
        }
    }

    return horizontalGaps;
}

/**
 * Computes the vertical gaps between elements
 *
 * @param referenceBounds the bounds of elements to compute gaps for
 * @returns the vertical gaps between elements
 */
function getVerticalGaps(referenceBounds: Bounds[]): Gap[] {
    const verticallySorted = referenceBounds.sort((a, b) => a.position.y - b.position.y);
    const verticalGaps: Gap[] = [];

    for (let i = 0; i < verticallySorted.length; i++) {
        const startBounds = verticallySorted[i];

        for (let j = i + 1; j < verticallySorted.length; j++) {
            if (verticalGaps.length >= VISIBLE_GAPS_LIMIT_PER_AXIS) {
                return verticalGaps;
            }

            const endBounds = verticallySorted[j];

            const startMinX = startBounds.position.x;
            const startMaxX = startMinX + startBounds.size.width;
            const startMaxY = startBounds.position.y + startBounds.size.height;
            const endMinX = endBounds.position.x;
            const endMinY = endBounds.position.y;
            const endMaxX = endMinX + endBounds.size.width;

            if (startMaxY < endMinY && rangesOverlap([startMinX, startMaxX], [endMinX, endMaxX])) {
                verticalGaps.push({
                    startBounds,
                    endBounds,
                    startSide: [
                        { x: startMinX, y: startMaxY },
                        { x: startMaxX, y: startMaxY }
                    ],
                    endSide: [
                        { x: endMinX, y: endMinY },
                        { x: endMaxX, y: endMinY }
                    ],
                    length: endMinY - startMaxY,
                    overlap: rangeIntersection([startMinX, startMaxX], [endMinX, endMaxX])!
                });
            }
        }
    }

    return verticalGaps;
}

/**
 * Computes the gap snaps
 *
 * @param elementBounds the bounds of the elements to move
 * @param elementOffset The offset to apply to the elements being moved
 * @param visibleGaps visible gaps from {@code getVisibleGaps}
 * @param snapState The current snap state with nearest snaps and minimum offset
 * @param context The context in which the snapping is performed
 * @param options enable/disable snapping in x and y direction
 */
export function getGapSnaps(
    elementBounds: Bounds,
    elementOffset: Vector,
    visibleGaps: Gaps,
    snapState: SnapState,
    context: string,
    options: SnapOptions
): void {
    const { horizontalGaps, verticalGaps } = visibleGaps;
    let snapGaps: GapSnapOptions;
    if (options.snapGaps === true) {
        snapGaps = {
            left: true,
            right: true,
            top: true,
            bottom: true,
            centerHorizontal: true,
            centerVertical: true
        };
    } else {
        snapGaps = options.snapGaps as GapSnapOptions;
    }

    if (options.snapX) {
        getHorizontalGapSnaps(elementBounds, elementOffset, horizontalGaps, snapState, context, snapGaps);
    }
    if (options.snapY) {
        getVerticalGapSnaps(elementBounds, elementOffset, verticalGaps, snapState, context, snapGaps);
    }
}

/**
 * Computes horizontal gap snaps for the given element bounds and horizontal gaps.
 *
 * @param elementBounds The bounds of the element being moved.
 * @param elementOffset The offset to apply to the elements being moved
 * @param horizontalGaps The list of horizontal gaps to consider.
 * @param snapState The current snap state with nearest snaps and minimum offset
 * @param context The context in which the snapping is performed.
 * @param snapGaps The options for snapping gaps.
 */
function getHorizontalGapSnaps(
    elementBounds: Bounds,
    elementOffset: Vector,
    horizontalGaps: Gap[],
    snapState: SnapState,
    context: string,
    snapGaps: GapSnapOptions
): void {
    const { nearestSnapsX } = snapState;
    const minX = round(elementBounds.position.x);
    const maxX = round(elementBounds.position.x + elementBounds.size.width);
    const centerX = (minX + maxX) / 2;
    const minY = round(elementBounds.position.y);
    const maxY = round(elementBounds.position.y + elementBounds.size.height);
    const range = [minY + elementOffset.y, maxY + elementOffset.y] satisfies InclusiveRange;

    for (const gap of horizontalGaps) {
        if (!rangesOverlap(range, gap.overlap)) {
            continue;
        }

        const gapMidX = gap.startSide[0].x + gap.length / 2;
        const centerOffset = round(gapMidX - centerX);
        const gapIsLargerThanSelection = gap.length > maxX - minX;

        if (
            snapGaps.centerHorizontal &&
            gapIsLargerThanSelection &&
            shouldAddSnapX(snapState, centerOffset - elementOffset.x)
        ) {
            const snap: GapSnap = {
                type: SnapType.GAP,
                context,
                direction: GapSnapDirection.CENTER_HORIZONTAL,
                gap,
                offset: centerOffset,
                bounds: elementBounds
            };

            nearestSnapsX.push(snap);
            continue;
        }

        const endMaxX = gap.endBounds.position.x + gap.endBounds.size.width;
        const distanceToEndElementX = minX - endMaxX;
        const sideOffsetRight = round(gap.length - distanceToEndElementX);

        if (snapGaps.right && shouldAddSnapX(snapState, sideOffsetRight - elementOffset.x)) {
            const snap: GapSnap = {
                type: SnapType.GAP,
                context,
                direction: GapSnapDirection.SIDE_RIGHT,
                gap,
                offset: sideOffsetRight,
                bounds: elementBounds
            };
            nearestSnapsX.push(snap);
            continue;
        }

        const startMinX = gap.startBounds.position.x;
        const distanceToStartElementX = startMinX - maxX;
        const sideOffsetLeft = round(distanceToStartElementX - gap.length);

        if (snapGaps.left && shouldAddSnapX(snapState, sideOffsetLeft - elementOffset.x)) {
            const snap: GapSnap = {
                type: SnapType.GAP,
                context,
                direction: GapSnapDirection.SIDE_LEFT,
                gap,
                offset: sideOffsetLeft,
                bounds: elementBounds
            };
            nearestSnapsX.push(snap);
            continue;
        }
    }
}

/**
 * Computes vertical gap snaps for the given element bounds and vertical gaps.
 *
 * @param elementBounds The bounds of the element being moved.
 * @param elementOffset The offset to apply to the elements being moved
 * @param verticalGaps The list of vertical gaps to consider.
 * @param snapState The current snap state with nearest snaps and minimum offset
 * @param context The context in which the snapping is performed.
 * @param snapGaps The options for snapping gaps.
 */
function getVerticalGapSnaps(
    elementBounds: Bounds,
    elementOffset: Vector,
    verticalGaps: Gap[],
    snapState: SnapState,
    context: string,
    snapGaps: GapSnapOptions
): void {
    const { nearestSnapsY } = snapState;
    const minY = round(elementBounds.position.y);
    const maxY = round(elementBounds.position.y + elementBounds.size.height);
    const centerY = (minY + maxY) / 2;
    const minX = round(elementBounds.position.x);
    const maxX = round(elementBounds.position.x + elementBounds.size.width);
    const range = [minX + elementOffset.x, maxX + elementOffset.x] satisfies InclusiveRange;

    for (const gap of verticalGaps) {
        if (!rangesOverlap(range, gap.overlap)) {
            continue;
        }

        const gapMidY = gap.startSide[0].y + gap.length / 2;
        const centerOffset = round(gapMidY - centerY);
        const gapIsLargerThanSelection = gap.length > maxY - minY;

        if (
            snapGaps.centerVertical &&
            gapIsLargerThanSelection &&
            shouldAddSnapY(snapState, centerOffset - elementOffset.y)
        ) {
            const snap: GapSnap = {
                type: SnapType.GAP,
                context,
                direction: GapSnapDirection.CENTER_VERTICAL,
                gap,
                offset: centerOffset,
                bounds: elementBounds
            };

            nearestSnapsY.push(snap);
            continue;
        }

        const startMinY = gap.startBounds.position.y;
        const distanceToStartElementY = startMinY - maxY;
        const sideOffsetTop = round(distanceToStartElementY - gap.length);

        if (snapGaps.top && shouldAddSnapY(snapState, sideOffsetTop - elementOffset.y)) {
            const snap: GapSnap = {
                type: SnapType.GAP,
                context,
                direction: GapSnapDirection.SIDE_TOP,
                gap,
                offset: sideOffsetTop,
                bounds: elementBounds
            };
            nearestSnapsY.push(snap);
            continue;
        }

        const endMaxY = gap.endBounds.position.y + gap.endBounds.size.height;
        const distanceToEndElementY = round(minY - endMaxY);
        const sideOffsetBottom = gap.length - distanceToEndElementY;

        if (snapGaps.bottom && shouldAddSnapY(snapState, sideOffsetBottom - elementOffset.y)) {
            const snap: GapSnap = {
                type: SnapType.GAP,
                context,
                direction: GapSnapDirection.SIDE_BOTTOM,
                gap,
                offset: sideOffsetBottom,
                bounds: elementBounds
            };
            nearestSnapsY.push(snap);
            continue;
        }
    }
}

/**
 * Creates snap lines from gap snaps for rendering.
 * Generates visual guides for various gap snap types (center, sides) based on detected gaps.
 *
 * @param gapSnaps The gap snaps for which to create snap lines
 * @param transform The transformation matrix to apply to the snap points
 * @param contextGlobalRotations Map of global rotation values for each context
 * @param snapLines The map to populate with snap lines (modified)
 */
export function createGapSnapLines(
    gapSnaps: GapSnap[],
    transform: Matrix,
    contextGlobalRotations: Map<string, number>,
    snapLines: SnapLines
): void {
    const gapSnapLinesByContext = groupGapSnapsByContext(gapSnaps, transform);
    applyGapSnapLinesToResult(gapSnapLinesByContext, contextGlobalRotations, snapLines);
}

/**
 * Groups gap snaps by context and creates snap lines for each gap snap.
 *
 * @param gapSnaps The gap snaps to group by context
 * @param transform The transformation matrix to apply to the snap points
 * @returns A map of context IDs to gap snap lines
 */
function groupGapSnapsByContext(gapSnaps: GapSnap[], transform: Matrix): Map<string, GapSnapLine[]> {
    const gapSnapLinesByContext = new Map<string, GapSnapLine[]>();

    for (const gapSnap of gapSnaps) {
        if (!gapSnapLinesByContext.has(gapSnap.context)) {
            gapSnapLinesByContext.set(gapSnap.context, []);
        }
        const gapSnapLines = gapSnapLinesByContext.get(gapSnap.context)!;
        const bounds = gapSnap.bounds;
        const { x: minX, y: minY } = applyToPoint(transform, bounds.position);
        const { x: maxX, y: maxY } = applyToPoint(transform, {
            x: bounds.position.x + bounds.size.width,
            y: bounds.position.y + bounds.size.height
        });

        const verticalIntersection = rangeIntersection([minY, maxY], gapSnap.gap.overlap);
        const horizontalGapIntersection = rangeIntersection([minX, maxX], gapSnap.gap.overlap);

        createGapSnapLinesForDirection(
            gapSnap,
            verticalIntersection,
            horizontalGapIntersection,
            minX,
            maxX,
            minY,
            maxY,
            gapSnapLines
        );
    }

    return gapSnapLinesByContext;
}

/**
 * Creates gap snap lines for a specific direction based on the gap snap type.
 *
 * @param gapSnap The gap snap to create snap lines for
 * @param verticalIntersection The vertical intersection of the gap with the bounds
 * @param horizontalGapIntersection The horizontal intersection of the gap with the bounds
 * @param minX The minimum x coordinate of the bounds
 * @param maxX The maximum x coordinate of the bounds
 * @param minY The minimum y coordinate of the bounds
 * @param maxY The maximum y coordinate of the bounds
 * @param gapSnapLines The array to add the snap lines to
 */
function createGapSnapLinesForDirection(
    gapSnap: GapSnap,
    verticalIntersection: InclusiveRange | null,
    horizontalGapIntersection: InclusiveRange | null,
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
    gapSnapLines: GapSnapLine[]
): void {
    switch (gapSnap.direction) {
        case GapSnapDirection.CENTER_HORIZONTAL:
            createCenterHorizontalSnapLines(gapSnap, verticalIntersection, minX, maxX, gapSnapLines);
            break;
        case GapSnapDirection.CENTER_VERTICAL:
            createCenterVerticalSnapLines(gapSnap, horizontalGapIntersection, minY, maxY, gapSnapLines);
            break;
        case GapSnapDirection.SIDE_RIGHT:
            createSideRightSnapLines(gapSnap, verticalIntersection, minX, gapSnapLines);
            break;
        case GapSnapDirection.SIDE_LEFT:
            createSideLeftSnapLines(gapSnap, verticalIntersection, maxX, gapSnapLines);
            break;
        case GapSnapDirection.SIDE_TOP:
            createSideTopSnapLines(gapSnap, horizontalGapIntersection, maxY, gapSnapLines);
            break;
        case GapSnapDirection.SIDE_BOTTOM:
            createSideBottomSnapLines(gapSnap, horizontalGapIntersection, minY, gapSnapLines);
            break;
    }
}

/**
 * Applies transformed gap snap lines to the result map.
 *
 * @param gapSnapLinesByContext Map of context IDs to gap snap lines
 * @param contextGlobalRotations Map of global rotation values for each context
 * @param snapLines The map to populate with snap lines (modified)
 */
function applyGapSnapLinesToResult(
    gapSnapLinesByContext: Map<string, GapSnapLine[]>,
    contextGlobalRotations: Map<string, number>,
    snapLines: SnapLines
): void {
    for (const [context, gapSnapLines] of gapSnapLinesByContext.entries()) {
        if (!snapLines.has(context)) {
            snapLines.set(context, []);
        }
        const existingSnapLines = snapLines.get(context)!;
        const rotation = contextGlobalRotations.get(context)!;
        const matrix = rotateDEG(-rotation);
        existingSnapLines.push(
            ...dedupeGapSnapLines(
                gapSnapLines.map((gapSnapLine) => {
                    return {
                        ...gapSnapLine,
                        points: gapSnapLine.points.map((p) =>
                            applyToPoint(matrix, { x: round(p.x), y: round(p.y) })
                        ) as PointPair
                    };
                })
            )
        );
    }
}

/**
 * Creates center horizontal snap lines for a gap
 *
 * @param gapSnap The gap snap to create snap lines for
 * @param verticalIntersection The vertical intersection of the gap with the bounds
 * @param minX The minimum x coordinate of the bounds
 * @param maxX The maximum x coordinate of the bounds
 * @param gapSnapLines The array to add the snap lines to
 */
function createCenterHorizontalSnapLines(
    gapSnap: GapSnap,
    verticalIntersection: InclusiveRange | null,
    minX: number,
    maxX: number,
    gapSnapLines: GapSnapLine[]
): void {
    if (verticalIntersection) {
        const gapLineY = (verticalIntersection[0] + verticalIntersection[1]) / 2;

        gapSnapLines.push(
            {
                type: SnapLineType.GAP,
                direction: SnapDirection.HORIZONTAL,
                points: [
                    { x: gapSnap.gap.startSide[0].x, y: gapLineY },
                    { x: minX, y: gapLineY }
                ]
            },
            {
                type: SnapLineType.GAP,
                direction: SnapDirection.HORIZONTAL,
                points: [
                    { x: maxX, y: gapLineY },
                    { x: gapSnap.gap.endSide[0].x, y: gapLineY }
                ]
            }
        );
    }
}

/**
 * Creates center vertical snap lines for a gap
 *
 * @param gapSnap The gap snap to create snap lines for
 * @param horizontalGapIntersection The horizontal intersection of the gap with the bounds
 * @param minY The minimum y coordinate of the bounds
 * @param maxY The maximum y coordinate of the bounds
 * @param gapSnapLines The array to add the snap lines to
 */
function createCenterVerticalSnapLines(
    gapSnap: GapSnap,
    horizontalGapIntersection: InclusiveRange | null,
    minY: number,
    maxY: number,
    gapSnapLines: GapSnapLine[]
): void {
    if (horizontalGapIntersection) {
        const gapLineX = (horizontalGapIntersection[0] + horizontalGapIntersection[1]) / 2;

        gapSnapLines.push(
            {
                type: SnapLineType.GAP,
                direction: SnapDirection.VERTICAL,
                points: [
                    { x: gapLineX, y: gapSnap.gap.startSide[0].y },
                    { x: gapLineX, y: minY }
                ]
            },
            {
                type: SnapLineType.GAP,
                direction: SnapDirection.VERTICAL,
                points: [
                    { x: gapLineX, y: maxY },
                    { x: gapLineX, y: gapSnap.gap.endSide[0].y }
                ]
            }
        );
    }
}

/**
 * Creates side right snap lines for a gap
 *
 * @param gapSnap The gap snap to create snap lines for
 * @param verticalIntersection The vertical intersection of the gap with the bounds
 * @param minX The minimum x coordinate of the bounds
 * @param gapSnapLines The array to add the snap lines to
 */
function createSideRightSnapLines(
    gapSnap: GapSnap,
    verticalIntersection: InclusiveRange | null,
    minX: number,
    gapSnapLines: GapSnapLine[]
): void {
    if (verticalIntersection) {
        const gapLineY = (verticalIntersection[0] + verticalIntersection[1]) / 2;
        const startMaxX = gapSnap.gap.startBounds.position.x + gapSnap.gap.startBounds.size.width;
        const endMinX = gapSnap.gap.endBounds.position.x;
        const endMaxX = endMinX + gapSnap.gap.endBounds.size.width;

        gapSnapLines.push(
            {
                type: SnapLineType.GAP,
                direction: SnapDirection.HORIZONTAL,
                points: [
                    { x: startMaxX, y: gapLineY },
                    { x: endMinX, y: gapLineY }
                ]
            },
            {
                type: SnapLineType.GAP,
                direction: SnapDirection.HORIZONTAL,
                points: [
                    { x: endMaxX, y: gapLineY },
                    { x: minX, y: gapLineY }
                ]
            }
        );
    }
}

/**
 * Creates side left snap lines for a gap
 *
 * @param gapSnap The gap snap to create snap lines for
 * @param verticalIntersection The vertical intersection of the gap with the bounds
 * @param maxX The maximum x coordinate of the bounds
 * @param gapSnapLines The array to add the snap lines to
 */
function createSideLeftSnapLines(
    gapSnap: GapSnap,
    verticalIntersection: InclusiveRange | null,
    maxX: number,
    gapSnapLines: GapSnapLine[]
): void {
    if (verticalIntersection) {
        const gapLineY = (verticalIntersection[0] + verticalIntersection[1]) / 2;
        const startMinX = gapSnap.gap.startBounds.position.x;
        const startMaxX = startMinX + gapSnap.gap.startBounds.size.width;
        const endMinX = gapSnap.gap.endBounds.position.x;

        gapSnapLines.push(
            {
                type: SnapLineType.GAP,
                direction: SnapDirection.HORIZONTAL,
                points: [
                    { x: maxX, y: gapLineY },
                    { x: startMinX, y: gapLineY }
                ]
            },
            {
                type: SnapLineType.GAP,
                direction: SnapDirection.HORIZONTAL,
                points: [
                    { x: startMaxX, y: gapLineY },
                    { x: endMinX, y: gapLineY }
                ]
            }
        );
    }
}

/**
 * Creates side top snap lines for a gap
 *
 * @param gapSnap The gap snap to create snap lines for
 * @param horizontalGapIntersection The horizontal intersection of the gap with the bounds
 * @param maxY The maximum y coordinate of the bounds
 * @param gapSnapLines The array to add the snap lines to
 */
function createSideTopSnapLines(
    gapSnap: GapSnap,
    horizontalGapIntersection: InclusiveRange | null,
    maxY: number,
    gapSnapLines: GapSnapLine[]
): void {
    if (horizontalGapIntersection) {
        const gapLineX = (horizontalGapIntersection[0] + horizontalGapIntersection[1]) / 2;
        const startMinY = gapSnap.gap.startBounds.position.y;
        const startMaxY = startMinY + gapSnap.gap.startBounds.size.height;
        const endMinY = gapSnap.gap.endBounds.position.y;

        gapSnapLines.push(
            {
                type: SnapLineType.GAP,
                direction: SnapDirection.VERTICAL,
                points: [
                    { x: gapLineX, y: maxY },
                    { x: gapLineX, y: startMinY }
                ]
            },
            {
                type: SnapLineType.GAP,
                direction: SnapDirection.VERTICAL,
                points: [
                    { x: gapLineX, y: startMaxY },
                    { x: gapLineX, y: endMinY }
                ]
            }
        );
    }
}

/**
 * Creates side bottom snap lines for a gap
 *
 * @param gapSnap The gap snap to create snap lines for
 * @param horizontalGapIntersection The horizontal intersection of the gap with the bounds
 * @param minY The minimum y coordinate of the bounds
 * @param gapSnapLines The array to add the snap lines to
 */
function createSideBottomSnapLines(
    gapSnap: GapSnap,
    horizontalGapIntersection: InclusiveRange | null,
    minY: number,
    gapSnapLines: GapSnapLine[]
): void {
    if (horizontalGapIntersection) {
        const gapLineX = (horizontalGapIntersection[0] + horizontalGapIntersection[1]) / 2;
        const startMaxY = gapSnap.gap.startBounds.position.y + gapSnap.gap.startBounds.size.height;
        const endMinY = gapSnap.gap.endBounds.position.y;
        const endMaxY = endMinY + gapSnap.gap.endBounds.size.height;

        gapSnapLines.push(
            {
                type: SnapLineType.GAP,
                direction: SnapDirection.VERTICAL,
                points: [
                    { x: gapLineX, y: startMaxY },
                    { x: gapLineX, y: endMinY }
                ]
            },
            {
                type: SnapLineType.GAP,
                direction: SnapDirection.VERTICAL,
                points: [
                    { x: gapLineX, y: endMaxY },
                    { x: gapLineX, y: minY }
                ]
            }
        );
    }
}

/**
 * Deduplicates gap snap lines by their points.
 *
 * @param gapSnapLines The array of gap snap lines to deduplicate.
 * @returns A new array with unique gap snap lines.
 */
function dedupeGapSnapLines(gapSnapLines: GapSnapLine[]): GapSnapLine[] {
    const map = new Map<string, GapSnapLine>();

    for (const gapSnapLine of gapSnapLines) {
        const key = gapSnapLine.points.flatMap((point) => [round(point.x), round(point.y)]).join(",");

        if (!map.has(key)) {
            map.set(key, gapSnapLine);
        }
    }

    return Array.from(map.values());
}
