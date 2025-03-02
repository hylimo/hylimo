import type { Bounds } from "@hylimo/diagram-common";
import type { SModelElementImpl } from "sprotty";
import type { Selectable } from "sprotty-protocol";

/**
 * Marks elements which can be selected by box selection.
 */
export const boxSelectFeature = Symbol("boxSelectFeature");

/**
 * A box selectable element.
 */
export interface BoxSelectable extends Selectable {
    /**
     * Checks if the element is included in the given bounds.
     *
     * @param bounds The bounds to check
     * @returns True if the element is included in the bounds
     */
    isIncluded(bounds: Bounds): boolean;
}

/**
 * Checks if the given element is box selectable.
 *
 * @param element The element to check
 * @returns True if the element is box selectable
 */
export function isBoxSelectable(element: SModelElementImpl): element is SModelElementImpl & BoxSelectable {
    return element.hasFeature(boxSelectFeature);
}
