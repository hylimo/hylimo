import {
    AbsolutePoint,
    Bounds,
    CanvasAxisAlignedSegment,
    CanvasBezierSegment,
    CanvasConnection,
    CanvasElement,
    CanvasLineSegment,
    LinePoint,
    Math2D,
    Point,
    RelativePoint,
    type Vector
} from "@hylimo/diagram-common";
import type { SRoot } from "../../model/sRoot.js";
import type { SElement } from "../../model/sElement.js";
import type { SCanvas } from "../../model/canvas/sCanvas.js";
import { applyToPoint, compose, rotateDEG, type Matrix } from "transformation-matrix";
import type { CanvasLayoutEngine } from "@hylimo/diagram";
import type {
    SnapElementData,
    ContextSnapData,
    SnapReferenceData,
    ContextSnapReferenceData,
    SnapOptions,
    SnapResult,
    Snaps,
    SnapLine,
    Gaps,
    Gap,
    GapSnapOptions,
    GapSnap,
    PointSnapLine,
    GapSnapLine,
    InclusiveRange,
    PointPair
} from "./model.js";
import { GapSnapDirection, SnapDirection } from "./model.js";

/**
 * Snap distance for the snapping algorithm
 */
const SNAP_DISTANCE = 8;

/**
 * do not comput more gaps per axis than this limit
 */
const VISIBLE_GAPS_LIMIT_PER_AXIS = 99999;

/**
 * Calculates the points and bounds for the selected elements in all relevant contexts.
 * Selected elements that are in a canvas that is contained in an ignored element are ignored.
 *
 * @param root the current root element
 * @param selectedElements the selected elements to calculate the points and bounds for
 * @param ignoredElements elements to ignore children of
 * @returns a map of context ids to their points and bounds
 */
export function getSnapElementData(
    root: SRoot,
    selectedElements: SElement[],
    ignoredElements: Set<string>
): SnapElementData {
    const selectedElementsByContext = groupElementsByContext(selectedElements);
    const result = new Map<string, ContextSnapData>();
    const layoutEngine = root.layoutEngine;

    for (const [contextId, elements] of selectedElementsByContext.entries()) {
        const contextElement = root.index.getById(contextId)! as SCanvas | SRoot;
        if (isContextIgnored(contextElement, root, ignoredElements)) {
            continue;
        }

        const contextSnapData = createContextSnapData(contextElement, elements, layoutEngine);
        result.set(contextId, contextSnapData);
    }

    return result;
}

/**
 * Groups elements by their parent context ID
 *
 * @param elements The elements to group
 * @returns A map of context IDs to their contained elements
 */
function groupElementsByContext(elements: SElement[]): Map<string, SElement[]> {
    const elementsByContext = new Map<string, SElement[]>();

    for (const element of elements) {
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

        if (!elementsByContext.has(element.parent.id)) {
            elementsByContext.set(element.parent.id, [element]);
        } else {
            elementsByContext.get(element.parent.id)!.push(element);
        }
    }

    return elementsByContext;
}

/**
 * Checks if a context should be ignored based on the ignored elements set
 *
 * @param contextElement The context element to check
 * @param root The root element
 * @param ignoredElements Set of element IDs to ignore
 * @returns True if the context should be ignored, false otherwise
 */
function isContextIgnored(contextElement: SCanvas | SRoot, root: SRoot, ignoredElements: Set<string>): boolean {
    let current: SElement | SRoot = contextElement;

    while (current !== root) {
        if (ignoredElements.has(current.id)) {
            return true;
        }
        current = (current as SElement).parent as SElement | SRoot;
    }

    return false;
}

/**
 * Creates snap data for a context and its elements
 *
 * @param contextElement The context element
 * @param elements The elements in this context
 * @param layoutEngine The layout engine
 * @returns Context snap data containing points and bounds
 */
function createContextSnapData(
    contextElement: SCanvas | SRoot,
    elements: SElement[],
    layoutEngine: any
): ContextSnapData {
    const contextToTarget = rotateDEG(contextElement.globalRotation);
    const contextId = contextElement.id;

    if (elements.length === 1) {
        return createSingleElementSnapData(elements[0], contextId, contextToTarget, layoutEngine);
    }

    return createMultiElementSnapData(elements, contextId, contextToTarget, layoutEngine);
}

/**
 * Creates snap data for a single element
 *
 * @param element The element to create snap data for
 * @param contextId The context ID
 * @param contextToTarget The transformation matrix
 * @param layoutEngine The layout engine
 * @returns Context snap data for the single element
 */
function createSingleElementSnapData(
    element: SElement,
    contextId: string,
    contextToTarget: Matrix,
    layoutEngine: CanvasLayoutEngine
): ContextSnapData {
    if (CanvasElement.isCanvasElement(element)) {
        const elementToTargetMatrix = compose(contextToTarget, layoutEngine.localToAncestor(element.id, contextId));
        const corners = getCanvasElementCorners(elementToTargetMatrix, element);
        const center = getCanvasElementCenter(elementToTargetMatrix, element);
        const bounds = Bounds.ofPoints(corners);

        return {
            points: [...corners, center].sort(Point.compare),
            bounds
        };
    } else {
        const point = layoutEngine.getPoint(element.id, contextId);
        return {
            points: [applyToPoint(contextToTarget, point)],
            bounds: undefined
        };
    }
}

/**
 * Creates snap data for multiple elements
 *
 * @param elements The elements to create snap data for
 * @param contextId The context ID
 * @param contextToTarget The transformation matrix
 * @param layoutEngine The layout engine
 * @returns Context snap data for the multiple elements
 */
function createMultiElementSnapData(
    elements: SElement[],
    contextId: string,
    contextToTarget: Matrix,
    layoutEngine: CanvasLayoutEngine
): ContextSnapData {
    const points: Point[] = [];

    for (const element of elements) {
        if (CanvasElement.isCanvasElement(element)) {
            const elementToTargetMatrix = compose(contextToTarget, layoutEngine.localToAncestor(element.id, contextId));
            const corners = getCanvasElementCorners(elementToTargetMatrix, element);
            points.push(...corners);
        } else {
            const point = layoutEngine.getPoint(element.id, contextId);
            points.push(applyToPoint(contextToTarget, point));
        }
    }

    const bounds = Bounds.ofPoints(points);
    return {
        points: [
            bounds.position,
            { x: bounds.position.x + bounds.size.width, y: bounds.position.y },
            { x: bounds.position.x + bounds.size.width, y: bounds.position.y + bounds.size.height },
            { x: bounds.position.x, y: bounds.position.y + bounds.size.height }
        ].sort(Point.compare),
        bounds
    };
}

/**
 * Calculates the reference points and bounds for the given contexts.
 *
 * @param root the current root element
 * @param contexts the contexts to calculate the reference points and bounds for (ids of SCanvas or SRoot elements)
 * @param ignoredElements elements which should not contribute to the reference points and bounds, even when they are visible
 * @returns a map of context ids to their reference points and bounds
 */
export function getSnapReferenceData(
    root: SRoot,
    contexts: Set<string>,
    ignoredElements: Set<string>
): SnapReferenceData {
    const result = new Map<string, ContextSnapReferenceData>();
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
        const contextToTarget = rotateDEG(canvas.globalRotation);
        const canvasPointIds: string[] = [];
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
                const elementToContext = layoutEngine.localToAncestor(element.id, context);
                const corners = getCanvasElementCorners(elementToContext, element);
                if (!checkedElements.has(element.id)) {
                    checkedElements.add(element.id);
                    if (
                        !corners.some((point) => Bounds.contains(visibleBounds, applyToPoint(contextToTarget, point)))
                    ) {
                        continue;
                    }
                    visibleCheckedElements.add(element.id);
                }
                const targetPoints = corners.map((corner) => applyToPoint(contextToTarget, corner));
                points.push(...targetPoints);
                points.push(applyToPoint(contextToTarget, getCanvasElementCenter(elementToContext, element)));
                bounds.push(Bounds.ofPoints(targetPoints));
                elementQueue.push(...element.children);
            } else if (CanvasConnection.isCanvasConnection(element)) {
                if (ignoredElements.has(element.id)) {
                    continue;
                }
                canvasPointIds.push(element.start);
                elementQueue.push(...element.children);
            } else if (
                CanvasLineSegment.isCanvasLineSegment(element) ||
                CanvasAxisAlignedSegment.isCanvasAxisAlignedSegment(element) ||
                CanvasBezierSegment.isCanvasBezierSegment(element)
            ) {
                if (ignoredElements.has(element.id)) {
                    continue;
                }
                canvasPointIds.push(element.end);
            } else {
                elementQueue.push(...element.children);
            }
        }
        for (const pointId of canvasPointIds) {
            if (ignoredElements.has(pointId)) {
                continue;
            }
            if (!checkedElements.has(pointId)) {
                checkedElements.add(pointId);
                if (Bounds.contains(visibleBounds, layoutEngine.getPoint(pointId, root.id))) {
                    visibleCheckedElements.add(pointId);
                }
            }
            if (visibleCheckedElements.has(pointId)) {
                const point = layoutEngine.getPoint(pointId, context);
                points.push(applyToPoint(contextToTarget, point));
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
 * Translates the given context information by the given translation vector.
 *
 * @param contextInfomations the context informations to translate
 * @param translation the translation vector
 * @returns the translated context informations
 */
export function translateSnapData(contextInfomations: SnapElementData, translation: Vector): SnapElementData {
    const result = new Map<string, ContextSnapData>();
    for (const [context, info] of contextInfomations.entries()) {
        const points = info.points.map((point) => Math2D.add(point, translation));
        const bounds =
            info.bounds != undefined
                ? {
                      position: Math2D.add(info.bounds.position, translation),
                      size: info.bounds.size
                  }
                : undefined;
        result.set(context, {
            points,
            bounds
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
export function intersectSnapReferenceDatas(a: SnapReferenceData, b: SnapReferenceData): SnapReferenceData {
    const result = new Map<string, ContextSnapReferenceData>();
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
 * Calculates snapping information for elements based on reference data.
 *
 * @param state The current state of the elements being moved/snapped
 * @param referenceState Reference data for elements to snap against
 * @param zoom The current zoom level of the viewport
 * @param options Configuration options for the snapping behavior
 * @returns Snap result containing offset and snap lines information
 */
export function getSnaps(
    state: SnapElementData,
    referenceState: SnapReferenceData,
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
        const visibleGaps = getGaps(referenceInfo.bounds);
        if (options.snapGaps != false && info.bounds != undefined) {
            getGapSnaps(info.bounds, visibleGaps, nearestSnapsX, nearestSnapsY, minOffset, context, options);
        }
        if (options.snapPoints) {
            getPointSnaps(referenceInfo.points, info.points, nearestSnapsX, nearestSnapsY, minOffset, context, options);
        }
    }
    const contextGlobalRotations = new Map<string, number>();
    for (const [context, info] of referenceState.entries()) {
        contextGlobalRotations.set(context, info.globalRotation);
    }

    return {
        snapOffset: {
            x: nearestSnapsX[0]?.offset ?? 0,
            y: nearestSnapsY[0]?.offset ?? 0
        },
        nearestSnapsX,
        nearestSnapsY,
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
export function getSnapLines(snapResult: SnapResult, transform: Matrix): Map<string, SnapLine[]> | undefined {
    const { nearestSnapsX, nearestSnapsY } = snapResult;
    const result = new Map<string, SnapLine[]>();
    createPointSnapLines(nearestSnapsX, nearestSnapsY, transform, snapResult.contextGlobalRotations, result);
    createGapSnapLines(
        [...nearestSnapsX, ...nearestSnapsY].filter((snap) => snap.type === "gap"),
        transform,
        snapResult.contextGlobalRotations,
        result
    );
    if (result.size === 0) {
        return undefined;
    }
    return result;
}

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
function getCanvasElementCenter(elementToTargetMatrix: Matrix, element: SElement & CanvasElement): Point {
    return applyToPoint(elementToTargetMatrix, {
        x: element.dx + element.width / 2,
        y: element.dy + element.height / 2
    });
}

/**
 * Computes the gaps between elements
 * Used in {@code getGapSnaps}
 *
 * @param referenceBounds the bounds of elements to compute gaps for (usually visible, non-selected elements)
 * @returns the gaps between elements
 */
function getGaps(referenceBounds: Bounds[]): Gaps {
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
        getHorizontalGapSnaps(elementBounds, horizontalGaps, minOffset, nearestSnapsX, context, snapGaps);
    }
    if (options.snapY) {
        getVerticalGapSnaps(elementBounds, verticalGaps, minOffset, nearestSnapsY, context, snapGaps);
    }
}

/**
 * Computes horizontal gap snaps for the given element bounds and horizontal gaps.
 *
 * @param elementBounds The bounds of the element being moved.
 * @param horizontalGaps The list of horizontal gaps to consider.
 * @param minOffset The minimum offset to snap to (modified).
 * @param nearestSnapsX The list to save nearest snaps for the x-axis (modified).
 * @param context The context in which the snapping is performed.
 * @param snapGaps The options for snapping gaps.
 */
function getHorizontalGapSnaps(
    elementBounds: Bounds,
    horizontalGaps: Gap[],
    minOffset: Point,
    nearestSnapsX: Snaps,
    context: string,
    snapGaps: GapSnapOptions
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

        const gapMidX = gap.startSide[0].x + gap.length / 2;
        const centerOffset = round(gapMidX - centerX);
        const gapIsLargerThanSelection = gap.length > maxX - minX;

        if (snapGaps.centerHorizontal && gapIsLargerThanSelection && Math.abs(centerOffset) <= minOffset.x) {
            if (Math.abs(centerOffset) < minOffset.x) {
                nearestSnapsX.length = 0;
            }
            minOffset.x = Math.abs(centerOffset);

            const snap: GapSnap = {
                type: "gap",
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

        if (snapGaps.right && Math.abs(sideOffsetRight) <= minOffset.x) {
            if (Math.abs(sideOffsetRight) < minOffset.x) {
                nearestSnapsX.length = 0;
            }
            minOffset.x = Math.abs(sideOffsetRight);

            const snap: GapSnap = {
                type: "gap",
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

        if (snapGaps.left && Math.abs(sideOffsetLeft) <= minOffset.x) {
            if (Math.abs(sideOffsetLeft) < minOffset.x) {
                nearestSnapsX.length = 0;
            }
            minOffset.x = Math.abs(sideOffsetLeft);

            const snap: GapSnap = {
                type: "gap",
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
 * @param verticalGaps The list of vertical gaps to consider.
 * @param minOffset The minimum offset to snap to (modified).
 * @param nearestSnapsY The list to save nearest snaps for the y-axis (modified).
 * @param context The context in which the snapping is performed.
 * @param snapGaps The options for snapping gaps.
 */
function getVerticalGapSnaps(
    elementBounds: Bounds,
    verticalGaps: Gap[],
    minOffset: Point,
    nearestSnapsY: Snaps,
    context: string,
    snapGaps: GapSnapOptions
): void {
    const minY = round(elementBounds.position.y);
    const maxY = round(elementBounds.position.y + elementBounds.size.height);
    const centerY = (minY + maxY) / 2;
    const minX = round(elementBounds.position.x);
    const maxX = round(elementBounds.position.x + elementBounds.size.width);

    for (const gap of verticalGaps) {
        if (!rangesOverlap([minX, maxX], gap.overlap)) {
            continue;
        }

        const gapMidY = gap.startSide[0].y + gap.length / 2;
        const centerOffset = round(gapMidY - centerY);
        const gapIsLargerThanSelection = gap.length > maxY - minY;

        if (snapGaps.centerVertical && gapIsLargerThanSelection && Math.abs(centerOffset) <= minOffset.y) {
            if (Math.abs(centerOffset) < minOffset.y) {
                nearestSnapsY.length = 0;
            }
            minOffset.y = Math.abs(centerOffset);

            const snap: GapSnap = {
                type: "gap",
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

        if (snapGaps.top && Math.abs(sideOffsetTop) <= minOffset.y) {
            if (Math.abs(sideOffsetTop) < minOffset.y) {
                nearestSnapsY.length = 0;
            }
            minOffset.y = Math.abs(sideOffsetTop);

            const snap: GapSnap = {
                type: "gap",
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

        if (snapGaps.bottom && Math.abs(sideOffsetBottom) <= minOffset.y) {
            if (Math.abs(sideOffsetBottom) < minOffset.y) {
                nearestSnapsY.length = 0;
            }
            minOffset.y = Math.abs(sideOffsetBottom);

            const snap: GapSnap = {
                type: "gap",
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
 * Computes the point snaps
 *
 * @param referenceSnapPoints the reference snap points (usually visible, non-selected elements)
 * @param selectionSnapPoints the selection snap points (usually selected elements)
 * @param nearestSnapsX list to save nearest snaps for x axis (modified)
 * @param nearestSnapsY list to save nearest snaps for y axis (modified)
 * @param minOffset minimum offset to snap to (modified)
 * @param context the context in which the snapping is performed
 * @param options enable/disable snapping in x and y direction
 */
function getPointSnaps(
    referenceSnapPoints: Point[],
    selectionSnapPoints: Point[],
    nearestSnapsX: Snaps,
    nearestSnapsY: Snaps,
    minOffset: Vector,
    context: string,
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
                    context,
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
                    context,
                    point: thisSnapPoint,
                    referencePoint: otherSnapPoint,
                    offset: offsetY
                });

                minOffset.y = Math.abs(offsetY);
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
function createPointSnapLines(
    nearestSnapsX: Snaps,
    nearestSnapsY: Snaps,
    transform: Matrix,
    contextGlobalRotations: Map<string, number>,
    snapLines: Map<string, SnapLine[]>
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

    if (nearestSnapsX.length > 0) {
        for (const snap of nearestSnapsX) {
            if (snap.type === "point") {
                const key = round(snap.point.x);
                const transformedPoint = applyToPoint(transform, snap.point);
                addPoints(snapsX, snap.context, key, [
                    { x: round(transformedPoint.x), y: round(transformedPoint.y) },
                    { x: round(snap.referencePoint.x), y: round(snap.referencePoint.y) }
                ]);
            }
        }
    }

    if (nearestSnapsY.length > 0) {
        for (const snap of nearestSnapsY) {
            if (snap.type === "point") {
                const key = round(snap.point.y);
                const transformedPoint = applyToPoint(transform, snap.point);
                addPoints(snapsY, snap.context, key, [
                    { x: round(transformedPoint.x), y: round(transformedPoint.y) },
                    { x: round(snap.referencePoint.x), y: round(snap.referencePoint.y) }
                ]);
            }
        }
    }
    for (const [context, entries] of snapsX.entries()) {
        if (!snapLines.has(context)) {
            snapLines.set(context, []);
        }
        for (const [, points] of entries.entries()) {
            const snapLine: PointSnapLine = {
                type: "points",
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
                type: "points",
                points: dedupePoints(points.sort(Point.compare))
            };
            snapLines.get(context)!.push(snapLine);
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
function createGapSnapLines(
    gapSnaps: GapSnap[],
    transform: Matrix,
    contextGlobalRotations: Map<string, number>,
    snapLines: Map<string, SnapLine[]>
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
    snapLines: Map<string, SnapLine[]>
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
                type: "gap",
                direction: SnapDirection.HORIZONTAL,
                points: [
                    { x: gapSnap.gap.startSide[0].x, y: gapLineY },
                    { x: minX, y: gapLineY }
                ]
            },
            {
                type: "gap",
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
                type: "gap",
                direction: SnapDirection.VERTICAL,
                points: [
                    { x: gapLineX, y: gapSnap.gap.startSide[0].y },
                    { x: gapLineX, y: minY }
                ]
            },
            {
                type: "gap",
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
                type: "gap",
                direction: SnapDirection.HORIZONTAL,
                points: [
                    { x: startMaxX, y: gapLineY },
                    { x: endMinX, y: gapLineY }
                ]
            },
            {
                type: "gap",
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
                type: "gap",
                direction: SnapDirection.HORIZONTAL,
                points: [
                    { x: maxX, y: gapLineY },
                    { x: startMinX, y: gapLineY }
                ]
            },
            {
                type: "gap",
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
                type: "gap",
                direction: SnapDirection.VERTICAL,
                points: [
                    { x: gapLineX, y: maxY },
                    { x: gapLineX, y: startMinY }
                ]
            },
            {
                type: "gap",
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
                type: "gap",
                direction: SnapDirection.VERTICAL,
                points: [
                    { x: gapLineX, y: startMaxY },
                    { x: gapLineX, y: endMinY }
                ]
            },
            {
                type: "gap",
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

/**
 * Snap distance with zoom value taken into consideration
 *
 * @param zoomValue the zoom value of the canvas
 * @returns the snap distance
 */
function getSnapDistance(zoomValue: number): number {
    return SNAP_DISTANCE / zoomValue;
}

/**
 * Round a number to a fixed number of decimal places.
 *
 * @param x The number to round.
 * @returns The rounded number.
 */
function round(x: number): number {
    const decimalPlaces = 6;
    return Math.round(x * 10 ** decimalPlaces) / 10 ** decimalPlaces;
}

/**
 * Deduplicates points in an array by their x and y coordinates.
 *
 * @param points The array of points to deduplicate.
 * @returns A new array with unique points.
 */
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
