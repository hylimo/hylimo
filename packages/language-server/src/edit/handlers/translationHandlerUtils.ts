import { AbsolutePoint, CanvasElement, Element, RelativePoint } from "@hylimo/diagram-common";

/**
 * When doing a translation move, computes the elements to which a prediction should be applied
 * If there are only points, only those are returned
 * If there are only canvas elements, the positions of those elements are returned
 * If there are both, no points are returned as in this case the prediction is unreliable
 *
 * @param elements the elements to compute the updates for
 * @param elementLookup a lookup table for all current elements
 * @returns the elements to update, or undefined if the prediction is unreliable
 */
export function computeElementsToUpdate(
    elements: Element[],
    elementLookup: Record<string, Element>
): (AbsolutePoint | RelativePoint)[] | undefined {
    const points: (AbsolutePoint | RelativePoint)[] = [];
    const canvasElements: CanvasElement[] = [];
    for (const element of elements) {
        if (AbsolutePoint.isAbsolutePoint(element) || RelativePoint.isRelativePoint(element)) {
            points.push(element);
        } else if (CanvasElement.isCanvasElement(element)) {
            canvasElements.push(element);
        }
    }
    if (points.length > 0) {
        if (canvasElements.length > 0) {
            return undefined;
        } else {
            return points;
        }
    }
    const pointIds = canvasElements.filter((element) => element.pos != undefined).map((element) => element.pos!);
    return [...new Set(pointIds)]
        .map((id) => elementLookup[id])
        .filter((element): element is AbsolutePoint | RelativePoint => {
            if (element == undefined) {
                return false;
            }
            return AbsolutePoint.isAbsolutePoint(element) || RelativePoint.isRelativePoint(element);
        });
}
