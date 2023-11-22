import { SModelElementImpl } from "sprotty";

/**
 * Used to mark fields as animatable by linear interpolation
 */
export interface LinearAnimatable {
    /**
     * The animated fields, must be number properties
     */
    animatedFields: Set<string>;
}

/**
 * Checks if an element is linear animatable
 *
 * @param element the element to check
 * @returns true if the element is linear animatable
 */
export function isLinearAnimatable(element: SModelElementImpl): element is SModelElementImpl & LinearAnimatable {
    return "animatedFields" in element;
}

/**
 * Gets the list of animatable fields present in both elements
 *
 * @param left the first LinearAnimatable
 * @param right the second LinearAnimatable
 * @returns the common fields
 */
export function computeCommonAnimatableFields(left: LinearAnimatable, right: LinearAnimatable): string[] {
    return [...left.animatedFields].filter((field) => right.animatedFields.has(field));
}
