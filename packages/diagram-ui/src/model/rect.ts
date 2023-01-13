import { LinearAnimatable } from "../features/animation/model";
import { SShape } from "./shape";

/**
 * Animated fields for SRect
 */
const rectAnimatedFields = new Set(SShape.defaultAnimatedFields);

/**
 * Rect model element
 */
export class SRect extends SShape implements LinearAnimatable {
    readonly animatedFields = rectAnimatedFields;
}
