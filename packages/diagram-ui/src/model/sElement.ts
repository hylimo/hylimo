import { SChildElementImpl } from "sprotty";
import { EditSpecification, Element, Point } from "@hylimo/diagram-common";
import { SRoot } from "./sRoot.js";
import { Matrix, applyToPoint } from "transformation-matrix";

/**
 * Base class for all elements
 */
export abstract class SElement extends SChildElementImpl implements Element {
    override children!: SElement[];

    /**
     * The edit specification for this element
     */
    edits!: EditSpecification;

    /**
     * A matrix that transforms the local coordinates of this element to the parent's coordinates
     * If undefined, the identity matrix is assumed
     */
    localToParentMatrix?: Matrix;

    /**
     * A matrix that transforms the parent's coordinates to the local coordinates of this element
     * If undefined, the identity matrix is assumed
     */
    parentToLocalMatrix?: Matrix;

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
                const revision = (this.root as SRoot).changeRevision;
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
        const point = (this.parent as SRoot | SElement).getEventCoordinates(event);
        const parentToLocal = this.parentToLocalMatrix;
        if (parentToLocal != undefined) {
            return applyToPoint(parentToLocal, point);
        } else {
            return point;
        }
    }
}
