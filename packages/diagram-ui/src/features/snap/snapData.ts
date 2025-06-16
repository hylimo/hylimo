import type { CanvasLayoutEngine } from "@hylimo/diagram-common";
import {
    CanvasElement,
    CanvasConnection,
    CanvasLineSegment,
    CanvasAxisAlignedSegment,
    CanvasBezierSegment,
    Bounds,
    Point,
    CanvasPoint
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
