import { SChildElementImpl } from "sprotty";
import { EditSpecification, Element, Point } from "@hylimo/diagram-common";
import { SRoot } from "./sRoot.js";
import { applyToPoint, inverse } from "transformation-matrix";

/**
 * Base class for all elements
 */
export abstract class SElement extends SChildElementImpl implements Element {
    override children!: SElement[];

    /**
     * The edit specification for this element
     */
    edits!: EditSpecification;

    override get root(): SRoot {
        return super.root as SRoot;
    }

    /**
     * Creats a cached property on this element
     *
     * @param name the name of the property
     * @param initializer initializer for the property
     */
    protected cachedProperty<T>(name: string, initializer: () => Exclude<T, undefined>): void {
        let currentVersion = Number.NaN;
        let currentValue: T | undefined = undefined;
        Object.defineProperty(this, name, {
            enumerable: true,
            get: () => {
                const revision = this.root.changeRevision;
                if (currentValue === undefined || revision != currentVersion) {
                    currentVersion = revision;
                    currentValue = initializer();
                }
                return currentValue;
            }
        });
    }

    /**
     * Gets the coordinates of a mouse event
     *
     * @param event the mouse event
     * @returns the coordinates of the event
     */
    getEventCoordinates(event: MouseEvent): Point {
        const rootCoordinates = this.root.getEventCoordinates(event);
        const localToParent = this.root.layoutEngine.localToAncestor(this.id, this.root.id);
        const parentToLocal = inverse(localToParent);
        return applyToPoint(parentToLocal, rootCoordinates);
    }
}
