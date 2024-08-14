import { Fill, Shape, Stroke } from "@hylimo/diagram-common";
import { SLayoutedElement } from "./sLayoutedElement.js";

/**
 * Base class for all shapes
 */
export abstract class SShape extends SLayoutedElement implements Shape {
    /**
     * The fill of the shape
     */
    fill?: Fill;
    /**
     * The stroke of the shape
     */
    stroke?: Stroke;
}

export namespace SShape {
    /**
     * Default animated fields
     */
    export const defaultAnimatedFields = [...SLayoutedElement.defaultAnimatedFields];
}
