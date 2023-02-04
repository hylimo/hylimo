import { Animation, CommandExecutionContext, SModelRoot } from "sprotty";
import { SRoot } from "../../model/sRoot";
import { CancelableCommandExecutionContext } from "./cancelableCommandExecutionContext";

/**
 * Base class for cancelable animations.
 * A canceled animation immediately stops animation and does NOT animate to the final state.
 */
export abstract class CancelableAnimation extends Animation {
    /**
     * Creates a new CancelableAnimation
     *
     * @param newModel the new model which is returned on cancel
     * @param context the context to pass to super
     */
    constructor(protected readonly newModel: SModelRoot, context: CommandExecutionContext) {
        super(context);
    }

    tween(t: number, context: CommandExecutionContext): SModelRoot {
        if (CancelableCommandExecutionContext.isCanceled(context)) {
            return this.newModel;
        } else {
            const newRoot = this.tweenInternal(t, context);
            (newRoot as SRoot).changeRevision++;
            return newRoot;
        }
    }

    /**
     * This method called by the animation at each rendering pass until
     * the duration is reached. Implement it to interpolate the state.
     * Replacement for tween due to cancel support
     *
     * @param t varies between 0 (start of animation) and 1 (end of animation)
     * @param context provided context
     * @returns the new model
     */
    abstract tweenInternal(t: number, context: CommandExecutionContext): SModelRoot;
}
