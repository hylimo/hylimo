import { CommandExecutionContext, SModelElementImpl, SModelRootImpl } from "sprotty";
import { CancelableAnimation } from "./cancelableAnimation.js";
import { LinearAnimatable } from "./model.js";

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
        newModel: SModelRootImpl,
        public readonly elementAnimations: ElmentLinearInterpolationAnimation[],
        context: CommandExecutionContext
    ) {
        super(newModel, context);
    }

    override tweenInternal(t: number, _context: CommandExecutionContext): SModelRootImpl {
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
    element: SModelElementImpl & LinearAnimatable;
    /**
     * Animations, map of field name to [from, to] pair
     */
    interpolations: Map<string, [number, number]>;
}
