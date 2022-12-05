import { SChildElement } from "sprotty";
import { Point } from "sprotty-protocol";
import { Size } from "@hylimo/diagram";

/**
 * Base class for all elements
 */
export abstract class SElement extends SChildElement implements Point, Size {
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
