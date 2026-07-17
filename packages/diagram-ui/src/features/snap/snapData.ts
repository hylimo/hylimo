import type { CanvasLayoutEngine } from "@hylimo/diagram-common";
import {
    CanvasElement,
    CanvasConnection,
    CanvasLineSegment,
    CanvasAxisAlignedSegment,
    CanvasBezierSegment,
    Bounds,
    Point,
    CanvasPoint,
    LineSegment
} from "@hylimo/diagram-common";
import { applyToPoint, compose, rotateDEG, type Matrix } from "transformation-matrix";
import type { SCanvas } from "../../model/canvas/sCanvas.js";
import type { SElement } from "../../model/sElement.js";
import type { SRoot } from "../../model/sRoot.js";
import type { SnapElementData, ContextSnapData, SnapReferenceData, ContextSnapReferenceData } from "./model.js";
import { getCanvasElementCenter, getCanvasElementCorners, intersectSortedArrays } from "./util.js";

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
        if (!(CanvasPoint.isCanvasPoint(element) || CanvasElement.isCanvasElement(element))) {
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
        const verticalSegmentBounds: Bounds[] = [];
        const horizontalSegmentBounds: Bounds[] = [];
        elementQueue.push(...(canvas.children as SElement[]));
        const contextToTarget = rotateDEG(canvas.globalRotation);
        const canvasPointIds: string[] = [];
        while (elementQueue.length > 0) {
            const element = elementQueue.pop()!;
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
                canvasPointIds.push(element.start);
                if (!ignoredElements.has(element.id)) {
                    collectConnectionSegmentBounds(
                        element,
                        context,
                        contextToTarget,
                        visibleBounds,
                        layoutEngine,
                        verticalSegmentBounds,
                        horizontalSegmentBounds
                    );
                }
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
            verticalSegmentBounds: verticalSegmentBounds.sort(Bounds.compare),
            horizontalSegmentBounds: horizontalSegmentBounds.sort(Bounds.compare),
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
export function intersectSnapReferenceDatas(a: SnapReferenceData, b: SnapReferenceData): SnapReferenceData {
    const result = new Map<string, ContextSnapReferenceData>();
    for (const [context, aInfo] of a.entries()) {
        const bInfo = b.get(context);
        if (!bInfo || aInfo.globalRotation !== bInfo.globalRotation) {
            continue;
        }
        const points = intersectSortedArrays(aInfo.points, bInfo.points, Point.compare);
        const bounds = intersectSortedArrays(aInfo.bounds, bInfo.bounds, Bounds.compare);
        const verticalSegmentBounds = intersectSortedArrays(
            aInfo.verticalSegmentBounds,
            bInfo.verticalSegmentBounds,
            Bounds.compare
        );
        const horizontalSegmentBounds = intersectSortedArrays(
            aInfo.horizontalSegmentBounds,
            bInfo.horizontalSegmentBounds,
            Bounds.compare
        );
        result.set(context, {
            points,
            bounds,
            verticalSegmentBounds,
            horizontalSegmentBounds,
            globalRotation: aInfo.globalRotation
        });
    }
    return result;
}

/**
 * Epsilon used to decide whether a line segment is axis-aligned in the target coordinate system.
 */
const SEGMENT_AXIS_ALIGNED_EPSILON = 10 ** -6;

/**
 * Collects the axis-aligned (vertical/horizontal) straight line segments of a connection as degenerate bounds.
 * Only segments which remain axis-aligned in the target (root-aligned) coordinate system are collected;
 * this automatically handles canvas rotations which are multiples of 90 degrees and discards diagonal segments.
 *
 * @param connection the connection whose segments should be collected
 * @param context the id of the context (canvas) the reference data is computed for
 * @param contextToTarget the transformation from the context to the target coordinate system
 * @param visibleBounds the currently visible bounds in the target coordinate system; segments outside are ignored
 * @param layoutEngine the layout engine used to obtain the connection geometry
 * @param verticalSegmentBounds collected zero-width bounds of vertical segments (modified)
 * @param horizontalSegmentBounds collected zero-height bounds of horizontal segments (modified)
 */
function collectConnectionSegmentBounds(
    connection: CanvasConnection,
    context: string,
    contextToTarget: Matrix,
    visibleBounds: Bounds,
    layoutEngine: CanvasLayoutEngine,
    verticalSegmentBounds: Bounds[],
    horizontalSegmentBounds: Bounds[]
): void {
    const { line, transform } = layoutEngine.layoutLine(connection, context);
    const toTarget = compose(contextToTarget, transform);
    let previous = applyToPoint(toTarget, line.start);
    for (const segment of line.segments) {
        const current = applyToPoint(toTarget, segment.end);
        if (segment.type === LineSegment.TYPE) {
            const segmentBounds = createAxisAlignedSegmentBounds(previous, current);
            if (segmentBounds != undefined && boundsOverlap(segmentBounds.bounds, visibleBounds)) {
                if (segmentBounds.vertical) {
                    verticalSegmentBounds.push(segmentBounds.bounds);
                } else {
                    horizontalSegmentBounds.push(segmentBounds.bounds);
                }
            }
        }
        previous = current;
    }
}

/**
 * Creates degenerate bounds for a straight line segment if it is axis-aligned.
 * A vertical segment results in zero-width bounds, a horizontal segment in zero-height bounds.
 *
 * @param start the start of the segment
 * @param end the end of the segment
 * @returns the created bounds together with the orientation, or undefined if the segment is not axis-aligned
 */
function createAxisAlignedSegmentBounds(start: Point, end: Point): { bounds: Bounds; vertical: boolean } | undefined {
    const deltaX = Math.abs(end.x - start.x);
    const deltaY = Math.abs(end.y - start.y);
    if (deltaX < SEGMENT_AXIS_ALIGNED_EPSILON && deltaY < SEGMENT_AXIS_ALIGNED_EPSILON) {
        return undefined;
    }
    if (deltaX < SEGMENT_AXIS_ALIGNED_EPSILON) {
        return {
            bounds: {
                position: { x: start.x, y: Math.min(start.y, end.y) },
                size: { width: 0, height: deltaY }
            },
            vertical: true
        };
    }
    if (deltaY < SEGMENT_AXIS_ALIGNED_EPSILON) {
        return {
            bounds: {
                position: { x: Math.min(start.x, end.x), y: start.y },
                size: { width: deltaX, height: 0 }
            },
            vertical: false
        };
    }
    return undefined;
}

/**
 * Checks whether two bounds overlap (including touching edges).
 *
 * @param a the first bounds
 * @param b the second bounds
 * @returns true if the bounds overlap
 */
function boundsOverlap(a: Bounds, b: Bounds): boolean {
    return (
        a.position.x <= b.position.x + b.size.width &&
        a.position.x + a.size.width >= b.position.x &&
        a.position.y <= b.position.y + b.size.height &&
        a.position.y + a.size.height >= b.position.y
    );
}
