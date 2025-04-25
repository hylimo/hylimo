import {
    AbsolutePoint,
    Bounds,
    CanvasElement,
    LinePoint,
    Point,
    RelativePoint,
    type Vector
} from "@hylimo/diagram-common";
import type { SRoot } from "../../model/sRoot.js";
import type { SElement } from "../../model/sElement.js";
import type { SCanvas } from "../../model/canvas/sCanvas.js";
import { applyToPoint, inverse, type Matrix } from "transformation-matrix";

/**
 * Snap distance for the snapping algorithm
 */
const SNAP_DISTANCE = 8;

/**
 * do not comput more gaps per axis than this limit
 */
const VISIBLE_GAPS_LIMIT_PER_AXIS = 99999;

/**
 * Snap distance with zoom value taken into consideration
 *
 * @param zoomValue the zoom value of the canvas
 * @returns the snap distance
 */
export function getSnapDistance(zoomValue: number): number {
    return SNAP_DISTANCE / zoomValue;
}

type PointPair = [Point, Point];

export type PointSnap = {
    type: "point";
    point: Point;
    referencePoint: Point;
    offset: number;
};

export type InclusiveRange = [number, number];

/**
 * Gap between two elements/bounds
 *
 * start side ↓     length
 * ┌───────────┐◄───────────────►
 * │           │-----------------┌───────────┐
 * │  start    │       ↑         │           │
 * │  element  │    overlap      │  end      │
 * │           │       ↓         │  element  │
 * └───────────┘-----------------│           │
 *                               └───────────┘
 *                               ↑ end side
 */
export type Gap = {
    startBounds: Bounds;
    endBounds: Bounds;
    startSide: [Point, Point];
    endSide: [Point, Point];
    overlap: InclusiveRange;
    length: number;
};

interface Gaps {
    horizontalGaps: Gap[];
    verticalGaps: Gap[];
}

export type GapSnap = {
    type: "gap";
    direction: "center_horizontal" | "center_vertical" | "side_left" | "side_right" | "side_top" | "side_bottom";
    gap: Gap;
    bounds: Bounds;
    offset: number;
};

export type GapSnaps = GapSnap[];

export type Snap = GapSnap | PointSnap;
export type Snaps = Snap[];

export type PointSnapLine = {
    type: "points";
    points: Point[];
};

export type GapSnapLine = {
    type: "gap";
    direction: "horizontal" | "vertical";
    points: PointPair;
};

export type SnapLine = PointSnapLine | GapSnapLine;

/**
 * Information about elements to snap to in the context of a given canvas
 */
export interface ContextReferenceInformation {
    /**
     * The points used for snapping (sorted)
     */
    points: Point[];
    /**
     * The bounds of the elements, position in the context, but aligned with the root coordinate system, sorted
     */
    bounds: Bounds[];
    /**
     * The global rotation of the canvas
     */
    globalRotation: number;
}

/**
 * Information about the dragged elements in the context of a given canvas
 */
export interface ContextInformation {
    /**
     * The points used for snapping (sorted)
     */
    points: Point[];
    /**
     * The bounds of the elements, position in the context, but aligned with the root coordinate system
     */
    bounds: Bounds | undefined;
}

export interface SnapOptions {
    /**
     * If true, elements can be snapped in the x direction
     */
    snapX: boolean;
    /**
     * If true, elements can be snapped in the y direction
     */
    snapY: boolean;
    /**
     * If true, point snapping is enabled
     */
    snapPoints: boolean;
    /**
     * If true, gap snapping is enabled
     */
    snapGaps: boolean;
}

/**
 * Snapping result
 */
export interface SnapResult {
    /**
     * The offset to snap to
     */
    snapOffset: Vector;
    /**
     * Nearest snaps for the x axis (used for calculating snap lines)
     */
    nearestSnapsX: Snaps;
    /**
     * Nearest snaps for the y axis (used for calculating snap lines)
     */
    nearestSnapsY: Snaps;
}

/**
 * Calculates the points and bounds for the selected elements in all relevant contexts.
 * Selected elements that are in a canvas that is contained in an ignored element are ignored.
 *
 * @param root the current root element
 * @param selectedElements the selected elements to calculate the points and bounds for
 * @param ignoredElements elements to ignore children of
 * @returns a map of context ids to their points and bounds
 */
export function getPointsAndBounds(
    root: SRoot,
    selectedElements: SElement[],
    ignoredElements: Set<string>
): Map<string, ContextInformation> {
    const selectedElementsByContext = new Map<string, SElement[]>();
    for (const element of selectedElements) {
        if (
            !(
                CanvasElement.isCanvasElement(element) ||
                AbsolutePoint.isAbsolutePoint(element) ||
                RelativePoint.isRelativePoint(element) ||
                LinePoint.isLinePoint(element)
            )
        ) {
            continue;
        }
        if (!selectedElementsByContext.has(element.id)) {
            selectedElementsByContext.set(element.id, [element]);
        } else {
            selectedElementsByContext.get(element.id)!.push(element);
        }
    }
    const result = new Map<string, ContextInformation>();
    const layoutEngine = root.layoutEngine;
    for (const [context, elements] of selectedElementsByContext.entries()) {
        let current: SElement | SRoot = root.index.getById(context)! as SCanvas | SRoot;
        let isIgnored = false;
        while (current !== root) {
            if (ignoredElements.has(current.id)) {
                isIgnored = true;
                break;
            }
            current = (current as SElement).parent as SElement | SRoot;
        }
        if (isIgnored) {
            continue;
        }
        const rootToContextMatrix = inverse(layoutEngine.localToAncestor(context, root.id));
        if (elements.length === 1) {
            const element = elements[0];
            if (CanvasElement.isCanvasElement(element)) {
                const elementToRootMatrix = layoutEngine.localToAncestor(element.id, root.id);
                const corners = getCanvasElementCorners(elementToRootMatrix, element);
                const center = getCanvasElementCenter(elementToRootMatrix, element);
                const rootBounds = Bounds.ofPoints(corners);
                result.set(context, {
                    points: [...corners, center]
                        .map((point) => applyToPoint(rootToContextMatrix, point))
                        .sort(Point.compare),
                    bounds: {
                        position: applyToPoint(rootToContextMatrix, rootBounds.position),
                        size: rootBounds.size
                    }
                });
            } else {
                const point = layoutEngine.getPoint(element.id, context);
                result.set(context, {
                    points: [applyToPoint(rootToContextMatrix, point)],
                    bounds: undefined
                });
            }
        } else {
            const points: Point[] = [];
            for (const element of elements) {
                if (CanvasElement.isCanvasElement(element)) {
                    const elementToRootMatrix = layoutEngine.localToAncestor(element.id, root.id);
                    const corners = getCanvasElementCorners(elementToRootMatrix, element);
                    points.push(...corners);
                } else {
                    const point = layoutEngine.getPoint(element.id, root.id);
                    points.push(point);
                }
            }
            const rootBounds = Bounds.ofPoints(points);
            result.set(context, {
                points: [
                    rootBounds.position,
                    { x: rootBounds.position.x + rootBounds.size.width, y: rootBounds.position.y },
                    {
                        x: rootBounds.position.x + rootBounds.size.width,
                        y: rootBounds.position.y + rootBounds.size.height
                    },
                    { x: rootBounds.position.x, y: rootBounds.position.y + rootBounds.size.height }
                ]
                    .map((point) => applyToPoint(rootToContextMatrix, point))
                    .sort(Point.compare),
                bounds: {
                    position: applyToPoint(rootToContextMatrix, rootBounds.position),
                    size: rootBounds.size
                }
            });
        }
    }
    return result;
}

/**
 * Calculates the reference points and bounds for the given contexts.
 *
 * @param root the current root element
 * @param contexts the contexts to calculate the reference points and bounds for (ids of SCanvas or SRoot elements)
 * @param ignoredElements elements which should not contribute to the reference points and bounds, even when they are visible
 * @returns a map of context ids to their reference points and bounds
 */
export function getReferencePointsAndBounds(
    root: SRoot,
    contexts: Set<string>,
    ignoredElements: Set<string>
): Map<string, ContextReferenceInformation> {
    const result = new Map<string, ContextReferenceInformation>();
    const checkedElements = new Set<string>();
    const visibleCheckedElements = new Set<string>();
    const visibleBounds: Bounds = {
        position: root.scroll,
        size: { width: root.canvasBounds.width / root.zoom, height: root.canvasBounds.height / root.zoom }
    };
    const layoutEngine = root.layoutEngine;
    for (const context of contexts) {
        const canvas = root.index.getById(context) as SRoot | SCanvas;
        const elementQueue: SElement[] = [];
        const points: Point[] = [];
        const bounds: Bounds[] = [];
        elementQueue.push(...(canvas.children as SElement[]));
        const rootToContextMatrix = inverse(layoutEngine.localToAncestor(context, root.id));
        while (elementQueue.length > 0) {
            const element = elementQueue.pop()!;
            if (ignoredElements.has(element.id)) {
                continue;
            }
            if (CanvasElement.isCanvasElement(element)) {
                if (ignoredElements.has(element.id)) {
                    continue;
                }
                if (checkedElements.has(element.id) && !visibleCheckedElements.has(element.id)) {
                    continue;
                }
                const elementToRootMatrix = layoutEngine.localToAncestor(element.id, root.id);
                const corners = getCanvasElementCorners(elementToRootMatrix, element);
                if (!checkedElements.has(element.id)) {
                    checkedElements.add(element.id);
                    if (!corners.some((point) => Bounds.contains(visibleBounds, point))) {
                        continue;
                    }
                    visibleCheckedElements.add(element.id);
                }
                points.push(getCanvasElementCenter(elementToRootMatrix, element));
                for (const corner of corners) {
                    points.push(applyToPoint(rootToContextMatrix, corner));
                }
                const rootBounds = Bounds.ofPoints(corners);
                bounds.push({
                    position: applyToPoint(rootToContextMatrix, rootBounds.position),
                    size: rootBounds.size
                });
                elementQueue.push(...element.children);
            } else if (
                AbsolutePoint.isAbsolutePoint(element) ||
                RelativePoint.isRelativePoint(element) ||
                LinePoint.isLinePoint(element)
            ) {
                if (ignoredElements.has(element.id)) {
                    continue;
                }
                if (!checkedElements.has(element.id)) {
                    checkedElements.add(element.id);
                    if (Bounds.contains(visibleBounds, layoutEngine.getPoint(element.id, root.id))) {
                        visibleCheckedElements.add(element.id);
                    }
                }
                if (visibleCheckedElements.has(element.id)) {
                    const point = layoutEngine.getPoint(element.id, context);
                    points.push(point);
                }
            } else {
                elementQueue.push(...element.children);
            }
        }
        result.set(context, {
            points: points.sort(Point.compare),
            bounds: bounds.sort(Bounds.compare),
            globalRotation: canvas.globalRotation
        });
    }

    return result;
}

/**
 * Intersects the given reference points and bounds per context.
 * Data for a context is only included, if it is present in both maps, and the global rotation is the same.
 * Then, an intersection of the points and bounds is calculated.
 *
 * @param a the first map of reference points and bounds
 * @param b the second map of reference points and bounds
 * @returns the generated intersection
 */
export function intersectReferencePointsAndBounds(
    a: Map<string, ContextReferenceInformation>,
    b: Map<string, ContextReferenceInformation>
): Map<string, ContextReferenceInformation> {
    const result = new Map<string, ContextReferenceInformation>();
    for (const [context, aInfo] of a.entries()) {
        const bInfo = b.get(context);
        if (!bInfo || aInfo.globalRotation !== bInfo.globalRotation) {
            continue;
        }
        const points = intersectSortedArrays(aInfo.points, bInfo.points, Point.compare);
        const bounds = intersectSortedArrays(aInfo.bounds, bInfo.bounds, Bounds.compare);
        result.set(context, {
            points,
            bounds,
            globalRotation: aInfo.globalRotation
        });
    }
    return result;
}

/**
 * Computes the corners of the given element in the root coordinate system
 *
 * @param elementToRootMatrix the transformation matrix from the element to the root coordinate system
 * @param element the element to compute the corners for
 * @returns the corners of the element in the root coordinate system
 */
function getCanvasElementCorners(elementToRootMatrix: Matrix, element: SElement & CanvasElement) {
    return [
        applyToPoint(elementToRootMatrix, { x: element.dx, y: element.dy }),
        applyToPoint(elementToRootMatrix, { x: element.dx + element.width, y: element.dy }),
        applyToPoint(elementToRootMatrix, { x: element.dx + element.width, y: element.dy + element.height }),
        applyToPoint(elementToRootMatrix, { x: element.dx, y: element.dy + element.height })
    ];
}

/**
 * Computes the center point of a canvas element in the root coordinate system.
 *
 * @param elementToRootMatrix - The transformation matrix from the element's local coordinate system to the root coordinate system.
 * @param element - The canvas element for which the center point is to be calculated.
 * @returns The center point of the canvas element in the root coordinate system.
 */
function getCanvasElementCenter(elementToRootMatrix: Matrix, element: SElement & CanvasElement) {
    return applyToPoint(elementToRootMatrix, {
        x: element.dx + element.width / 2,
        y: element.dy + element.height / 2
    });
}

/**
 * Computes the visible gaps between elements
 * Used in {@code getGapSnaps}
 *
 * @param referenceBounds the bounds of elements to compute gaps for (usually visible, non-selected elements)
 * @returns the gaps between elements
 */
export function getVisibleGaps(referenceBounds: Bounds[]): Gaps {
    const horizontallySorted = referenceBounds.sort((a, b) => a.position.x - b.position.x);

    const horizontalGaps: Gap[] = [];

    let c = 0;

    horizontal: for (let i = 0; i < horizontallySorted.length; i++) {
        const startBounds = horizontallySorted[i];

        for (let j = i + 1; j < horizontallySorted.length; j++) {
            if (++c > VISIBLE_GAPS_LIMIT_PER_AXIS) {
                break horizontal;
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

    const verticallySorted = referenceBounds.sort((a, b) => a.position.y - b.position.y);

    const verticalGaps: Gap[] = [];

    c = 0;

    vertical: for (let i = 0; i < verticallySorted.length; i++) {
        const startBounds = verticallySorted[i];

        for (let j = i + 1; j < verticallySorted.length; j++) {
            if (++c > VISIBLE_GAPS_LIMIT_PER_AXIS) {
                break vertical;
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

    return {
        horizontalGaps,
        verticalGaps
    };
}

/**
 * Computes the gap snaps
 *
 * @param elementBounds the bounds of the elements to move
 * @param visibleGaps visible gaps from {@code getVisibleGaps}
 * @param nearestSnapsX list to save nearest snaps for x axis (modified)
 * @param nearestSnapsY list to save nearest snaps for y axis (modified)
 * @param minOffset minimum offset to snap to (modified)
 * @param options enable/disable snapping in x and y direction
 */
function getGapSnaps(
    elementBounds: Bounds,
    visibleGaps: Gaps,
    nearestSnapsX: Snaps,
    nearestSnapsY: Snaps,
    minOffset: Vector,
    options: SnapOptions
): void {
    const { horizontalGaps, verticalGaps } = visibleGaps;

    if (options.snapX) {
        getHorizontalGapSnaps(elementBounds, horizontalGaps, minOffset, nearestSnapsX);
    }
    if (options.snapY) {
        getVerticalGapSnaps(elementBounds, verticalGaps, minOffset, nearestSnapsY);
    }
}

/**
 * Computes horizontal gap snaps for the given element bounds and horizontal gaps.
 *
 * @param elementBounds The bounds of the element being moved.
 * @param horizontalGaps The list of horizontal gaps to consider.
 * @param minOffset The minimum offset to snap to (modified).
 * @param nearestSnapsX The list to save nearest snaps for the x-axis (modified).
 */
function getHorizontalGapSnaps(
    elementBounds: Bounds,
    horizontalGaps: Gap[],
    minOffset: Point,
    nearestSnapsX: Snaps
): void {
    const minX = round(elementBounds.position.x);
    const maxX = round(elementBounds.position.x + elementBounds.size.width);
    const centerX = (minX + maxX) / 2;
    const minY = round(elementBounds.position.y);
    const maxY = round(elementBounds.position.y + elementBounds.size.height);

    for (const gap of horizontalGaps) {
        if (!rangesOverlap([minY, maxY], gap.overlap)) {
            continue;
        }

        // center gap
        const gapMidX = gap.startSide[0].x + gap.length / 2;
        const centerOffset = round(gapMidX - centerX);
        const gapIsLargerThanSelection = gap.length > maxX - minX;

        if (gapIsLargerThanSelection && Math.abs(centerOffset) <= minOffset.x) {
            if (Math.abs(centerOffset) < minOffset.x) {
                nearestSnapsX.length = 0;
            }
            minOffset.x = Math.abs(centerOffset);

            const snap: GapSnap = {
                type: "gap",
                direction: "center_horizontal",
                gap,
                offset: centerOffset,
                bounds: elementBounds
            };

            nearestSnapsX.push(snap);
            continue;
        }

        // side gap, from the right
        const endMaxX = gap.endBounds.position.x + gap.endBounds.size.width;
        const distanceToEndElementX = minX - endMaxX;
        const sideOffsetRight = round(gap.length - distanceToEndElementX);

        if (Math.abs(sideOffsetRight) <= minOffset.x) {
            if (Math.abs(sideOffsetRight) < minOffset.x) {
                nearestSnapsX.length = 0;
            }
            minOffset.x = Math.abs(sideOffsetRight);

            const snap: GapSnap = {
                type: "gap",
                direction: "side_right",
                gap,
                offset: sideOffsetRight,
                bounds: elementBounds
            };
            nearestSnapsX.push(snap);
            continue;
        }

        // side gap, from the left
        const startMinX = gap.startBounds.position.x;
        const distanceToStartElementX = startMinX - maxX;
        const sideOffsetLeft = round(distanceToStartElementX - gap.length);

        if (Math.abs(sideOffsetLeft) <= minOffset.x) {
            if (Math.abs(sideOffsetLeft) < minOffset.x) {
                nearestSnapsX.length = 0;
            }
            minOffset.x = Math.abs(sideOffsetLeft);

            const snap: GapSnap = {
                type: "gap",
                direction: "side_left",
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
 * @param verticalGaps The list of vertical gaps to consider.
 * @param minOffset The minimum offset to snap to (modified).
 * @param nearestSnapsY The list to save nearest snaps for the y-axis (modified).
 */
function getVerticalGapSnaps(elementBounds: Bounds, verticalGaps: Gap[], minOffset: Point, nearestSnapsY: Snaps): void {
    const minY = round(elementBounds.position.y);
    const maxY = round(elementBounds.position.y + elementBounds.size.height);
    const centerY = (minY + maxY) / 2;
    const minX = round(elementBounds.position.x);
    const maxX = round(elementBounds.position.x + elementBounds.size.width);

    for (const gap of verticalGaps) {
        if (!rangesOverlap([minX, maxX], gap.overlap)) {
            continue;
        }

        // center gap
        const gapMidY = gap.startSide[0].y + gap.length / 2;
        const centerOffset = round(gapMidY - centerY);
        const gapIsLargerThanSelection = gap.length > maxY - minY;

        if (gapIsLargerThanSelection && Math.abs(centerOffset) <= minOffset.y) {
            if (Math.abs(centerOffset) < minOffset.y) {
                nearestSnapsY.length = 0;
            }
            minOffset.y = Math.abs(centerOffset);

            const snap: GapSnap = {
                type: "gap",
                direction: "center_vertical",
                gap,
                offset: centerOffset,
                bounds: elementBounds
            };

            nearestSnapsY.push(snap);
            continue;
        }

        // side gap, from the top
        const startMinY = gap.startBounds.position.y;
        const distanceToStartElementY = startMinY - maxY;
        const sideOffsetTop = round(distanceToStartElementY - gap.length);

        if (Math.abs(sideOffsetTop) <= minOffset.y) {
            if (Math.abs(sideOffsetTop) < minOffset.y) {
                nearestSnapsY.length = 0;
            }
            minOffset.y = Math.abs(sideOffsetTop);

            const snap: GapSnap = {
                type: "gap",
                direction: "side_top",
                gap,
                offset: sideOffsetTop,
                bounds: elementBounds
            };
            nearestSnapsY.push(snap);
            continue;
        }

        // side gap, from the bottom
        const endMaxY = gap.endBounds.position.y + gap.endBounds.size.height;
        const distanceToEndElementY = round(minY - endMaxY);
        const sideOffsetBottom = gap.length - distanceToEndElementY;

        if (Math.abs(sideOffsetBottom) <= minOffset.y) {
            if (Math.abs(sideOffsetBottom) < minOffset.y) {
                nearestSnapsY.length = 0;
            }
            minOffset.y = Math.abs(sideOffsetBottom);

            const snap: GapSnap = {
                type: "gap",
                direction: "side_bottom",
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
 * Computes the point snaps
 *
 * @param referenceSnapPoints the reference snap points (usually visible, non-selected elements)
 * @param selectionSnapPoints the selection snap points (usually selected elements)
 * @param nearestSnapsX list to save nearest snaps for x axis (modified)
 * @param nearestSnapsY list to save nearest snaps for y axis (modified)
 * @param minOffset minimum offset to snap to (modified)
 * @param options enable/disable snapping in x and y direction
 */
function getPointSnaps(
    referenceSnapPoints: Point[],
    selectionSnapPoints: Point[],
    nearestSnapsX: Snaps,
    nearestSnapsY: Snaps,
    minOffset: Vector,
    options: SnapOptions
): void {
    for (const thisSnapPoint of selectionSnapPoints) {
        for (const otherSnapPoint of referenceSnapPoints) {
            const offsetX = otherSnapPoint.x - thisSnapPoint.x;
            const offsetY = otherSnapPoint.y - thisSnapPoint.y;

            if (options.snapX && Math.abs(offsetX) <= minOffset.x) {
                if (Math.abs(offsetX) < minOffset.x) {
                    nearestSnapsX.length = 0;
                }

                nearestSnapsX.push({
                    type: "point",
                    point: thisSnapPoint,
                    referencePoint: otherSnapPoint,
                    offset: offsetX
                });

                minOffset.x = Math.abs(offsetX);
            }

            if (options.snapY && Math.abs(offsetY) <= minOffset.y) {
                if (Math.abs(offsetY) < minOffset.y) {
                    nearestSnapsY.length = 0;
                }

                nearestSnapsY.push({
                    type: "point",
                    point: thisSnapPoint,
                    referencePoint: otherSnapPoint,
                    offset: offsetY
                });

                minOffset.y = Math.abs(offsetY);
            }
        }
    }
}

export function getSnaps(
    state: Map<string, ContextInformation>,
    referenceState: Map<string, ContextReferenceInformation>,
    zoom: number,
    options: SnapOptions
): SnapResult {
    const snapDistance = getSnapDistance(zoom);
    const nearestSnapsX: Snaps = [];
    const nearestSnapsY: Snaps = [];
    const minOffset: Vector = {
        x: snapDistance,
        y: snapDistance
    };

    for (const [context, info] of state.entries()) {
        const referenceInfo = referenceState.get(context);
        if (!referenceInfo) {
            continue;
        }
        const visibleGaps = getVisibleGaps(referenceInfo.bounds);
        if (options.snapGaps) {
            getGapSnaps(info.bounds!, visibleGaps, nearestSnapsX, nearestSnapsY, minOffset, options);
        }
        if (options.snapPoints) {
            getPointSnaps(referenceInfo.points, info.points, nearestSnapsX, nearestSnapsY, minOffset, options);
        }
    }

    return {
        snapOffset: minOffset,
        nearestSnapsX,
        nearestSnapsY
    };
}

export function getSnapLines(snapResult: SnapResult, transform: Matrix): SnapLine[] {
    const { nearestSnapsX, nearestSnapsY } = snapResult;
    const pointSnapLines = createPointSnapLines(nearestSnapsX, nearestSnapsY, transform);
    const gapSnapLines = createGapSnapLines(
        [...nearestSnapsX, ...nearestSnapsY].filter((snap) => snap.type === "gap"),
        transform
    );
    return [...pointSnapLines, ...gapSnapLines];
}

function round(x: number): number {
    const decimalPlaces = 6;
    return Math.round(x * 10 ** decimalPlaces) / 10 ** decimalPlaces;
}

function dedupePoints(points: Point[]): Point[] {
    const map = new Map<string, Point>();

    for (const point of points) {
        const key = `${point.x},${point.y}`;

        if (!map.has(key)) {
            map.set(key, point);
        }
    }

    return Array.from(map.values());
}

function createPointSnapLines(nearestSnapsX: Snaps, nearestSnapsY: Snaps, transform: Matrix): PointSnapLine[] {
    const snapsX = {} as { [key: string]: Point[] };
    const snapsY = {} as { [key: string]: Point[] };

    if (nearestSnapsX.length > 0) {
        for (const snap of nearestSnapsX) {
            if (snap.type === "point") {
                // key = thisPoint.x
                const key = round(snap.point.x);
                if (!snapsX[key]) {
                    snapsX[key] = [];
                }
                const transformedPoint = applyToPoint(transform, snap.point);
                snapsX[key].push(
                    { x: round(transformedPoint.x), y: round(transformedPoint.y) },
                    { x: round(snap.referencePoint.x), y: round(snap.referencePoint.y) }
                );
            }
        }
    }

    if (nearestSnapsY.length > 0) {
        for (const snap of nearestSnapsY) {
            if (snap.type === "point") {
                // key = thisPoint.y
                const key = round(snap.point.y);
                if (!snapsY[key]) {
                    snapsY[key] = [];
                }
                const transformedPoint = applyToPoint(transform, snap.point);
                snapsY[key].push(
                    { x: round(transformedPoint.x), y: round(transformedPoint.y) },
                    { x: round(snap.referencePoint.x), y: round(snap.referencePoint.y) }
                );
            }
        }
    }

    return Object.entries(snapsX)
        .map(([key, points]) => {
            return {
                type: "points",
                points: dedupePoints(
                    points
                        .map((p) => {
                            return { x: Number(key), y: p.y };
                        })
                        .sort((a, b) => a.y - b.y)
                )
            } as PointSnapLine;
        })
        .concat(
            Object.entries(snapsY).map(([key, points]) => {
                return {
                    type: "points",
                    points: dedupePoints(
                        points
                            .map((p) => {
                                return { x: p.x, y: Number(key) };
                            })
                            .sort((a, b) => a.x - b.x)
                    )
                } as PointSnapLine;
            })
        );
}

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

function createGapSnapLines(gapSnaps: GapSnap[], transform: Matrix): GapSnapLine[] {
    const gapSnapLines: GapSnapLine[] = [];

    for (const gapSnap of gapSnaps) {
        const bounds = gapSnap.bounds;
        const { x: minX, y: minY } = applyToPoint(transform, bounds.position);
        const { x: maxX, y: maxY } = applyToPoint(transform, {
            x: bounds.position.x + bounds.size.width,
            y: bounds.position.y + bounds.size.height
        });
        const startMinX = gapSnap.gap.startBounds.position.x;
        const startMinY = gapSnap.gap.startBounds.position.y;
        const startMaxX = startMinX + gapSnap.gap.startBounds.size.width;
        const startMaxY = startMinY + gapSnap.gap.startBounds.size.height;
        const endMinX = gapSnap.gap.endBounds.position.x;
        const endMinY = gapSnap.gap.endBounds.position.y;
        const endMaxX = endMinX + gapSnap.gap.endBounds.size.width;
        const endMaxY = endMinY + gapSnap.gap.endBounds.size.height;

        const verticalIntersection = rangeIntersection([minY, maxY], gapSnap.gap.overlap);

        const horizontalGapIntersection = rangeIntersection([minX, maxX], gapSnap.gap.overlap);

        switch (gapSnap.direction) {
            case "center_horizontal": {
                if (verticalIntersection) {
                    const gapLineY = (verticalIntersection[0] + verticalIntersection[1]) / 2;

                    gapSnapLines.push(
                        {
                            type: "gap",
                            direction: "horizontal",
                            points: [
                                { x: gapSnap.gap.startSide[0].x, y: gapLineY },
                                { x: minX, y: gapLineY }
                            ]
                        },
                        {
                            type: "gap",
                            direction: "horizontal",
                            points: [
                                { x: maxX, y: gapLineY },
                                { x: gapSnap.gap.endSide[0].x, y: gapLineY }
                            ]
                        }
                    );
                }
                break;
            }
            case "center_vertical": {
                if (horizontalGapIntersection) {
                    const gapLineX = (horizontalGapIntersection[0] + horizontalGapIntersection[1]) / 2;

                    gapSnapLines.push(
                        {
                            type: "gap",
                            direction: "vertical",
                            points: [
                                { x: gapLineX, y: gapSnap.gap.startSide[0].y },
                                { x: gapLineX, y: minY }
                            ]
                        },
                        {
                            type: "gap",
                            direction: "vertical",
                            points: [
                                { x: gapLineX, y: maxY },
                                { x: gapLineX, y: gapSnap.gap.endSide[0].y }
                            ]
                        }
                    );
                }
                break;
            }
            case "side_right": {
                if (verticalIntersection) {
                    const gapLineY = (verticalIntersection[0] + verticalIntersection[1]) / 2;

                    gapSnapLines.push(
                        {
                            type: "gap",
                            direction: "horizontal",
                            points: [
                                { x: startMaxX, y: gapLineY },
                                { x: endMinX, y: gapLineY }
                            ]
                        },
                        {
                            type: "gap",
                            direction: "horizontal",
                            points: [
                                { x: endMaxX, y: gapLineY },
                                { x: minX, y: gapLineY }
                            ]
                        }
                    );
                }
                break;
            }
            case "side_left": {
                if (verticalIntersection) {
                    const gapLineY = (verticalIntersection[0] + verticalIntersection[1]) / 2;

                    gapSnapLines.push(
                        {
                            type: "gap",
                            direction: "horizontal",
                            points: [
                                { x: maxX, y: gapLineY },
                                { x: startMinX, y: gapLineY }
                            ]
                        },
                        {
                            type: "gap",
                            direction: "horizontal",
                            points: [
                                { x: startMaxX, y: gapLineY },
                                { x: endMinX, y: gapLineY }
                            ]
                        }
                    );
                }
                break;
            }
            case "side_top": {
                if (horizontalGapIntersection) {
                    const gapLineX = (horizontalGapIntersection[0] + horizontalGapIntersection[1]) / 2;

                    gapSnapLines.push(
                        {
                            type: "gap",
                            direction: "vertical",
                            points: [
                                { x: gapLineX, y: maxY },
                                { x: gapLineX, y: startMinY }
                            ]
                        },
                        {
                            type: "gap",
                            direction: "vertical",
                            points: [
                                { x: gapLineX, y: startMaxY },
                                { x: gapLineX, y: endMinY }
                            ]
                        }
                    );
                }
                break;
            }
            case "side_bottom": {
                if (horizontalGapIntersection) {
                    const gapLineX = (horizontalGapIntersection[0] + horizontalGapIntersection[1]) / 2;

                    gapSnapLines.push(
                        {
                            type: "gap",
                            direction: "vertical",
                            points: [
                                { x: gapLineX, y: startMaxY },
                                { x: gapLineX, y: endMinY }
                            ]
                        },
                        {
                            type: "gap",
                            direction: "vertical",
                            points: [
                                { x: gapLineX, y: endMaxY },
                                { x: gapLineX, y: minY }
                            ]
                        }
                    );
                }
                break;
            }
        }
    }

    return dedupeGapSnapLines(
        gapSnapLines.map((gapSnapLine) => {
            return {
                ...gapSnapLine,
                points: gapSnapLine.points.map((p) => ({ x: round(p.x), y: round(p.y) })) as PointPair
            };
        })
    );
}

/**
 * Given two ranges, return if the two ranges overlap with each other e.g.
 * [1, 3] overlaps with [2, 4] while [1, 3] does not overlap with [4, 5].
 *
 * @param param0 One of the ranges to compare
 * @param param1 The other range to compare against
 * @returns TRUE if the ranges overlap
 */
function rangesOverlap([a0, a1]: InclusiveRange, [b0, b1]: InclusiveRange): boolean {
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
function rangeIntersection([a0, a1]: InclusiveRange, [b0, b1]: InclusiveRange): InclusiveRange | null {
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
function intersectSortedArrays<T>(a: T[], b: T[], compare: (x: T, y: T) => number): T[] {
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
