import { SCanvas } from "./canvas";
import { SCanvasContent } from "./canvasContent";
import { SCanvasElement } from "./canvasElement";
import { SCanvasPoint } from "./canvasPoint";
import { SRelativePoint } from "./relativePoint";

/**
 * Manages a lookup for visible points
 * Keeps track of which points are currently selected, and evaluates which points must be visible based on this
 */
export class PointVisibilityManager {
    /**
     * Currently visible points
     */
    private visiblePoints = new Map<string, VisibilityReason>();
    /**
     * Dependants lookup (contains only dependent CanvasElements and RelativePoints)
     */
    private dependents = new Map<string, string[]>();

    /**
     * Dependencies lookup for RelativePoints and CanvasElements
     */
    private dependencies = new Map<string, string[]>();

    /**
     * Creates a new PointVisiblilityManager
     *
     * @param canvas the canvas which contains the points
     */
    constructor(canvas: SCanvas) {
        for (const child of canvas.children) {
            if (child instanceof SRelativePoint) {
                this.getDependantsList((child as SRelativePoint).target).push(child.id);
                this.getDependenciesList(child.id).push((child as SRelativePoint).target);
            } else if (child instanceof SCanvasElement) {
                this.getDependantsList((child as SCanvasElement).pos).push(child.id);
                this.getDependenciesList(child.id).push((child as SCanvasElement).pos);
            }
        }
    }

    /**
     * Helper to access a list in dependants
     * Creates new list if required
     *
     * @param id the id of the element
     * @returns the found list or the new created one
     */
    private getDependantsList(id: string): string[] {
        if (!this.dependents.has(id)) {
            this.dependents.set(id, []);
        }
        return this.dependents.get(id)!;
    }

    /**
     * Helper to access a list in dependencies
     * Creates new list if required
     *
     * @param id the id of the element
     * @returns the found list or the new created one
     */
    private getDependenciesList(id: string): string[] {
        if (!this.dependencies.has(id)) {
            this.dependencies.set(id, []);
        }
        return this.dependencies.get(id)!;
    }

    /**
     * Checks if a point with a specific id is visible
     *
     * @param id the id of the point to check
     * @returns true if the point should be visible
     */
    isVisible(id: string): boolean {
        return this.visiblePoints.has(id);
    }

    /**
     * Updates the selection state of a specific element
     *
     * @param element the element to update the state of
     * @param isSelected the new selection state
     */
    setSelectionState(element: SCanvasContent, isSelected: boolean): void {
        if (isSelected) {
            this.setSelected(element);
        } else {
            this.setUnselected(element);
        }
    }

    /**
     * Updates the selection state of a specific element to selected
     *
     * @param element the now selected element
     */
    private setSelected(element: SCanvasContent): void {
        if (element instanceof SCanvasPoint) {
            const visibilityReason = this.getOrCreateVisibilityReason(element.id);
            visibilityReason.self = true;
            this.makeDependenciesVisible(element.id);
            this.makeDependentsVisible(element.id);
        } else {
            this.makeDependenciesVisible(element.id);
        }
    }

    /**
     * Updates the selection state of a specific element to unselected
     *
     * @param element the now unselected element
     */
    private setUnselected(element: SCanvasContent): void {
        if (element instanceof SCanvasPoint) {
            const visibilityReason = this.visiblePoints.get(element.id);
            if (visibilityReason !== undefined) {
                visibilityReason.self = false;
                if (!VisibilityReason.isVisible(visibilityReason)) {
                    this.visiblePoints.delete(element.id);
                }
                if (visibilityReason.visibleDependencies.size === 0) {
                    this.updateDependants(element.id);
                }
                if (visibilityReason.visibleDependants.size === 0) {
                    this.updateDependencies(element.id);
                }
            }
        } else {
            this.updateDependencies(element.id);
        }
    }

    /**
     * Makes dependencies recursively visible
     * Updates recursively.
     *
     * @param id the id of the point or element of which to make the dependencies visible
     */
    private makeDependenciesVisible(id: string): void {
        for (const dependency of this.getDependenciesList(id)) {
            const visibilityReason = this.getOrCreateVisibilityReason(dependency);
            visibilityReason.visibleDependants.add(id);
            if (visibilityReason.visibleDependants.size === 1 && !visibilityReason.self) {
                this.makeDependenciesVisible(dependency);
            }
        }
    }

    /**
     * Makes dependents recursively visible
     * Updates recursively.
     *
     * @param id the id of the point of which to make the dependents visible
     */
    private makeDependentsVisible(id: string): void {
        for (const dependent of this.getDependantsList(id)) {
            const visibilityReason = this.getOrCreateVisibilityReason(dependent);
            visibilityReason.visibleDependencies.add(id);
            if (visibilityReason.visibleDependencies.size === 1 && !visibilityReason.self) {
                this.makeDependentsVisible(dependent);
            }
        }
    }

    /**
     * Gets or creates a VisibilityReason for a point and therefore marks it as visible
     *
     * @param id the id of the point
     * @returns the found or created VisibilityReason
     */
    private getOrCreateVisibilityReason(id: string): VisibilityReason {
        if (!this.visiblePoints.has(id)) {
            this.visiblePoints.set(id, {
                visibleDependants: new Set(),
                visibleDependencies: new Set(),
                self: false
            });
        }
        return this.visiblePoints.get(id)!;
    }

    /**
     * Recursively removes visible dependants if necessary
     *
     * @param id the id of the visible point to remove
     */
    private updateDependants(id: string): void {
        for (const dependant of this.getDependantsList(id)) {
            const visibilityReason = this.visiblePoints.get(dependant);
            if (visibilityReason !== undefined) {
                visibilityReason.visibleDependencies.delete(id);
                if (!VisibilityReason.isVisible(visibilityReason)) {
                    this.visiblePoints.delete(dependant);
                }
                if (!visibilityReason.self && visibilityReason.visibleDependencies.size === 0) {
                    this.updateDependants(dependant);
                }
            }
        }
    }

    /**
     * Recursively removes visible dependencies if necessary
     *
     * @param id the id of the visible point / element to remove
     */
    private updateDependencies(id: string): void {
        for (const dependency of this.getDependenciesList(id)) {
            const visibilityReason = this.visiblePoints.get(dependency);
            if (visibilityReason !== undefined) {
                visibilityReason.visibleDependants.delete(id);
                if (!VisibilityReason.isVisible(visibilityReason)) {
                    this.visiblePoints.delete(dependency);
                }
                if (!visibilityReason.self && visibilityReason.visibleDependants.size === 0) {
                    this.updateDependencies(dependency);
                }
            }
        }
    }
}

/**
 * Reason why a point is visible
 */
interface VisibilityReason {
    /**
     * Dependents which cause this to be visible
     */
    visibleDependants: Set<string>;
    /**
     * Dependencies which cause this to be visible
     */
    visibleDependencies: Set<string>;
    /**
     * If true, is selected and therefore visible
     */
    self: boolean;
}

namespace VisibilityReason {
    /**
     * Evaluates if the visibilityReason is still valid and results in visibility
     *
     * @param visibilityReason the VisibilityReason to evaluate
     * @returns true if it still ensures visibility
     */
    export function isVisible(visibilityReason: VisibilityReason): boolean {
        return (
            visibilityReason.self ||
            visibilityReason.visibleDependants.size > 0 ||
            visibilityReason.visibleDependencies.size > 0
        );
    }
}
