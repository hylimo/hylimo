import { Shape } from "@hylimo/diagram-common";
import { SLayoutedElement } from "./sLayoutedElement";

/**
 * Base class for all shapes
 */
export abstract class SShape extends SLayoutedElement implements Shape {
    /**
     * The color of the fill of the shape
     */
    fill!: string;
    /**
     * The opacity applied to the fill
     */
    fillOpacity!: number;
    /**
     * The color of the stroke
     */
    stroke!: string;
    /**
     * The opacity applied to the stroke
     */
    strokeOpacity!: number;
    /**
     * The width of the stroke
     */
    strokeWidth!: number;
}

export namespace SShape {
    /**
     * Default animated fields
     */
    export const defaultAnimatedFields = [
        ...SLayoutedElement.defaultAnimatedFields,
        "strokeWidth",
        "strokeOpacity",
        "fillOpacity"
    ];
}
