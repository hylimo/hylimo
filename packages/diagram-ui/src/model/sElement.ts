import { SChildElement } from "sprotty";
import { Element } from "@hylimo/diagram-common";
import { SRoot } from "./sRoot";

/**
 * Base class for all elements
 */
export abstract class SElement extends SChildElement implements Element {
    override children!: SElement[];

    /**
     * Creats a cached property on this element
     *
     * @param name the name of the property
     * @param initializer initializer for the property
     */
    protected cachedProperty<T>(name: string, initializer: () => NonNullable<T>): void {
        let currentVersion = Number.NaN;
        let currentValue: T | undefined = undefined;
        const that = this;
        Object.defineProperty(this, name, {
            enumerable: true,
            get(): T {
                const revision = (that.root as SRoot).changeRevision;
                if (currentValue === undefined || revision != currentVersion) {
                    currentVersion = revision;
                    currentValue = initializer();
                }
                return currentValue;
            }
        });
    }
}
