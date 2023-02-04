import { CommandExecutionContext, SModelElement, SModelRoot } from "sprotty";
import { CancelableAnimation } from "./cancelableAnimation";
import { LinearAnimatable } from "./model";

/**
 * Linear interpolation animation
 */
export class LinearInterpolationAnimation extends CancelableAnimation {
    /**
     * Creates a new LinearInterpolationAnimation
     *
     * @param newModel the model which is returned, all elementAnimations must be part of this model
     * @param elementAnimations element animations
     * @param context required context
     */
    constructor(
        newModel: SModelRoot,
        public readonly elementAnimations: ElmentLinearInterpolationAnimation[],
        context: CommandExecutionContext
    ) {
        super(newModel, context);
    }

    override tweenInternal(t: number, _context: CommandExecutionContext): SModelRoot {
        for (const animation of this.elementAnimations) {
            animation.interpolations.forEach(([from, to], field) => {
                let newValue = to;
                if (t < 1) {
                    newValue = (1 - t) * from + t * to;
                }
                (animation.element as any)[field] = newValue;
            });
        }
        return this.newModel;
    }
}

/**
 * Defines linear interpolatin animations for an element
 */
export interface ElmentLinearInterpolationAnimation {
    /**
     * The element to animate
     */
    element: SModelElement & LinearAnimatable;
    /**
     * Animations, map of field name to [from, to] pair
     */
    interpolations: Map<string, [number, number]>;
}
