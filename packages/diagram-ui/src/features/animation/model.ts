import type { SModelElementImpl } from "sprotty";

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

/**
 * Used to mark string fields that hold an SVG path and should be animated by morphing the path
 * (interpolating its coordinates) rather than by numeric interpolation.
 */
export interface PathAnimatable {
    /**
     * The animated path fields, must be string properties holding an SVG path. Optional path fields
     * (undefined on one side) are simply skipped.
     */
    pathAnimatedFields: Set<string>;
}

/**
 * Checks if an element is path animatable
 *
 * @param element the element to check
 * @returns true if the element is path animatable
 */
export function isPathAnimatable(element: SModelElementImpl): element is SModelElementImpl & PathAnimatable {
    return "pathAnimatedFields" in element;
}

/**
 * Gets the list of path animatable fields present in both elements
 *
 * @param left the first PathAnimatable
 * @param right the second PathAnimatable
 * @returns the common path fields
 */
export function computeCommonPathAnimatableFields(left: PathAnimatable, right: PathAnimatable): string[] {
    return [...left.pathAnimatedFields].filter((field) => right.pathAnimatedFields.has(field));
}
