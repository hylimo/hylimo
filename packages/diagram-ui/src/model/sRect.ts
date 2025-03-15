import type { Rect } from "@hylimo/diagram-common";
import type { LinearAnimatable } from "../features/animation/model.js";
import { SShape } from "./sShape.js";

/**
 * Animated fields for SRect
 */
const rectAnimatedFields = new Set(SShape.defaultAnimatedFields);

/**
 * Rect model element
 */
export class SRect extends SShape implements Rect, LinearAnimatable {
    override type!: typeof Rect.TYPE;
    readonly animatedFields = rectAnimatedFields;

    /**
     * The radius of the corners
     */
    cornerRadius?: number;
}
