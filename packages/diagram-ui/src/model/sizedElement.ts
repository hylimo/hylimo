import { Size } from "@hylimo/diagram-common";
import { SChildElement } from "sprotty";

/**
 * Base class for all elements
 */
export abstract class SSizedElement extends SChildElement implements Size {
    /**
     * The width of the element
     */
    width!: number;
    /**
     * The height of the element
     */
    height!: number;
}

export namespace SSizedElement {
    /**
     * Default animated fields
     */
    export const defaultAnimatedFields = ["width", "height"];
}
