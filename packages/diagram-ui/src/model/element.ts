import { SChildElement } from "sprotty";
import { Size, Point } from "@hylimo/diagram-common";

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
