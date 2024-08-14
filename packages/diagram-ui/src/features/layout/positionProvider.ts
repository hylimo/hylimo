import { Point } from "@hylimo/diagram-common";
import { SModelElementImpl } from "sprotty";

/**
 * Provides a point which can be used as reference
 */
export interface PositionProvider {
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
export function isPositionProvider(element: SModelElementImpl): element is SModelElementImpl & PositionProvider {
    return "position" in element;
}
