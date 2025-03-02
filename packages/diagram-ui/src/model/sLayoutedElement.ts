import type { LayoutedElement } from "@hylimo/diagram-common";
import { SElement } from "./sElement.js";

/**
 * Base class for all elements
 */
export abstract class SLayoutedElement extends SElement implements LayoutedElement {
    /**
     * The width of the element
     */
    width!: number;
    /**
     * The height of the element
     */
    height!: number;
    /**
     * The absolute x coordinate of the element
     */
    x!: number;
    /**
     * The absolute y coordinate of the element
     */
    y!: number;
}

export namespace SLayoutedElement {
    /**
     * Default animated fields
     */
    export const defaultAnimatedFields = ["width", "height", "x", "y"];
}
