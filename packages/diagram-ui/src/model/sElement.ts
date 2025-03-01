import { SChildElementImpl } from "sprotty";
import type { EditSpecification, Element } from "@hylimo/diagram-common";
import type { SRoot } from "./sRoot.js";
import type { Matrix } from "transformation-matrix";
import { inverse, compose } from "transformation-matrix";

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
     * Creates a cached property on this element
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
     * Gets a transformation matrix which can be applied to mouse events
     *
     * @returns the transformation matrix
     */
    getMouseTransformationMatrix(): Matrix {
        const rootMatrix = this.root.getMouseTransformationMatrix();
        const localToParent = this.root.layoutEngine.localToAncestor(this.id, this.root.id);
        const parentToLocal = inverse(localToParent);
        return compose(parentToLocal, rootMatrix);
    }
}
