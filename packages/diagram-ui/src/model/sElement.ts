import { SChildElementImpl } from "sprotty";
import { Element } from "@hylimo/diagram-common";
import { SRoot } from "./sRoot.js";

/**
 * Base class for all elements
 */
export abstract class SElement extends SChildElementImpl implements Element {
    override children!: SElement[];

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
}
