import { SCanvas } from "./sCanvas.js";
import { SCanvasConnection } from "./sCanvasConnection.js";
import { SCanvasContent } from "./sCanvasContent.js";
import { SMarker } from "./sMarker.js";

/**
 * Manages a lookup for visible points
 * Keeps track of which points are currently selected, and evaluates which points must be visible based on this
 */
export class PointVisibilityManager {
    /**
     * Currently visible CanvasContents
     */
    private visibleContents = new Map<string, VisibilityReason>();
    /**
     * Dependants lookup
     */
    private dependents = new Map<string, string[]>();

    /**
     * Dependencies lookup
     */
    private dependencies = new Map<string, string[]>();

    /**
     * Dependencies lookup for dependencies which should be made visible as dependend
     * ONLY if the element is directly visible (not transitive)
     */
    private peerDependencies = new Map<string, string[]>();

    /**
     * Creates a new PointVisiblilityManager
     *
     * @param canvas the canvas which contains the points
     */
    constructor(canvas: SCanvas) {
        for (const child of canvas.children) {
            if (child instanceof SCanvasContent) {
                this.registerElement(child);
            }
        }
    }

    /**
     * Registers a new element in the visibility manager
     * Initializes the (peer) dependencies and dependants
     *
     * @param element the element to register
     */
    private registerElement(element: SCanvasContent | SMarker): void {
        const id = element.id;
        const dependencies = element.dependencies;
        for (const dependency of dependencies) {
            this.getDependantsList(dependency).push(id);
        }
        this.getDependenciesList(id).push(...dependencies);
        if (element instanceof SCanvasConnection) {
            for (const dependency of dependencies) {
                this.getPeerDependenciesList(dependency).push(id);
            }
            if (element.startMarker != undefined) {
                this.registerElement(element.startMarker);
            }
            if (element.endMarker != undefined) {
                this.registerElement(element.endMarker);
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
     * Helper to access a list in peerDependencies
     * Creates new list if required
     *
     * @param id the id of the element
     * @returns the found list or the new created one
     */
    private getPeerDependenciesList(id: string): string[] {
        if (!this.peerDependencies.has(id)) {
            this.peerDependencies.set(id, []);
        }
        return this.peerDependencies.get(id)!;
    }

    /**
     * Checks if a point with a specific id is visible
     *
     * @param id the id of the point to check
     * @returns true if the point should be visible
     */
    isVisible(id: string): boolean {
        return this.visibleContents.has(id);
    }

    /**
     * Updates the selection state of a specific element
     *
     * @param element the element to update the state of
     * @param isSelected the new selection state
     */
    setSelectionState(element: SCanvasContent | SMarker, isSelected: boolean): void {
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
    private setSelected(element: SCanvasContent | SMarker): void {
        const visibilityReason = this.getOrCreateVisibilityReason(element.id);
        visibilityReason.self = true;
        this.makeDependenciesVisible(element.id);
        this.makeDependentsVisible(element.id);
        this.makePeerDependenciesVisible(element.id);
    }

    /**
     * Updates the selection state of a specific element to unselected
     *
     * @param element the now unselected element
     */
    private setUnselected(element: SCanvasContent | SMarker): void {
        const visibilityReason = this.visibleContents.get(element.id);
        if (visibilityReason !== undefined) {
            visibilityReason.self = false;
            this.updatePeerDependencies(element.id);
            if (!VisibilityReason.isVisible(visibilityReason)) {
                this.visibleContents.delete(element.id);
            }
            if (visibilityReason.visibleDependencies.size === 0) {
                this.updateDependants(element.id);
            }
            if (visibilityReason.visibleDependants.size === 0) {
                this.updateDependencies(element.id);
            }
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
            this.makeDependencyVisible(id, dependency);
        }
    }

    /**
     * Makes the dependency recursively visible
     * Updates recursively.
     * Helper for makeDependenciesVisible and makePeerDependenciesVisible
     *
     * @param id the id of the point or element of which to make the dependencies visible
     * @param dependency the id of the dependency to update
     */
    private makeDependencyVisible(id: string, dependency: string): void {
        const visibilityReason = this.getOrCreateVisibilityReason(dependency);
        visibilityReason.visibleDependants.add(id);
        if (visibilityReason.visibleDependants.size === 1 && !visibilityReason.self) {
            this.makeDependenciesVisible(dependency);
        }
    }

    /**
     * Makes dependencies recursively visible of peer dependencies
     *
     * @param id the id of the point or element of which to make the dependencies visible
     */
    private makePeerDependenciesVisible(id: string): void {
        for (const dependency of this.getPeerDependenciesList(id)) {
            this.makeDependencyVisible(id, dependency);
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
        if (!this.visibleContents.has(id)) {
            this.visibleContents.set(id, {
                visibleDependants: new Set(),
                visibleDependencies: new Set(),
                self: false
            });
        }
        return this.visibleContents.get(id)!;
    }

    /**
     * Recursively removes visible dependants if necessary
     *
     * @param id the id of the visible point to remove
     */
    private updateDependants(id: string): void {
        for (const dependant of this.getDependantsList(id)) {
            const visibilityReason = this.visibleContents.get(dependant);
            if (visibilityReason !== undefined) {
                visibilityReason.visibleDependencies.delete(id);
                if (!VisibilityReason.isVisible(visibilityReason)) {
                    this.visibleContents.delete(dependant);
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
            this.updateDependency(id, dependency);
        }
    }

    /**
     * Recursively removes visible dependencies if necessary
     * Helper for updateDependencies and updatePeerDependencies
     *
     * @param id the id of the visible point / element to remove
     * @param dependency the id of the dependency to update
     */
    private updateDependency(id: string, dependency: string): void {
        const visibilityReason = this.visibleContents.get(dependency);
        if (visibilityReason !== undefined) {
            visibilityReason.visibleDependants.delete(id);
            if (!VisibilityReason.isVisible(visibilityReason)) {
                this.visibleContents.delete(dependency);
            }
            if (!visibilityReason.self && visibilityReason.visibleDependants.size === 0) {
                this.updateDependencies(dependency);
            }
        }
    }

    /**
     * Recursively removes visible peer dependencies if necessary
     *
     * @param id the id of the visible point / element to remove
     */
    private updatePeerDependencies(id: string): void {
        for (const dependency of this.getPeerDependenciesList(id)) {
            this.updateDependency(id, dependency);
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
