import { findParentByFeature, isViewport, SModelElement } from "sprotty";

/**
 * Finds the zoom of the current viewport by searching for a viewport in the parents of element
 *
 * @param element the element which is a child of a viewport
 * @returns the found zoom or 1 if no viewport was found
 */
export function findViewportZoom(element: Readonly<SModelElement>): number {
    const viewport = findParentByFeature(element, isViewport);
    return viewport ? viewport.zoom : 1;
}
