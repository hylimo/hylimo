import { Point } from "@hylimo/diagram-common";
import { SModelElement, SModelExtension } from "sprotty";

/**
 * Provides a point which can be used as reference
 */
export interface PositionProvider extends SModelExtension {
    /**
     * The provided position
     */
    readonly position: Point;
}

/**
 * Checks if the provided element is a PositionProvider
 *
 * @param element the SModelElement to check
 * @returns true if the element is a PositionProvider
 */
export function isPositionProvider(element: SModelElement): element is SModelElement & PositionProvider {
    return "position" in element;
}
