import { Ellipse } from "@hylimo/diagram-common";
import { LinearAnimatable } from "../features/animation/model.js";
import { SShape } from "./sShape.js";

/**
 * Animated fields for SEllipse
 */
const ellipseAnimatedFields = new Set(SShape.defaultAnimatedFields);

/**
 * Ellipse model element
 */
export class SEllipse extends SShape implements Ellipse, LinearAnimatable {
    override type!: typeof Ellipse.TYPE;
    readonly animatedFields = ellipseAnimatedFields;

    /**
     * The radius of the corners
     */
    cornerRadius?: number;
}
