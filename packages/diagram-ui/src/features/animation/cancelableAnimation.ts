import type { CommandExecutionContext, SModelRootImpl } from "sprotty";
import { Animation } from "sprotty";
import type { SRoot } from "../../model/sRoot.js";
import { CancelableCommandExecutionContext } from "./cancelableCommandExecutionContext.js";

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
    constructor(
        protected readonly newModel: SModelRootImpl,
        context: CommandExecutionContext
    ) {
        super(context);
    }

    override tween(t: number, context: CommandExecutionContext): SModelRootImpl {
        if (CancelableCommandExecutionContext.isCanceled(context)) {
            if (CancelableCommandExecutionContext.isCanceledAndSkipped(context)) {
                return this.tweenAndUpdateChangeRevision(1, context);
            } else {
                return this.newModel;
            }
        } else {
            return this.tweenAndUpdateChangeRevision(t, context);
        }
    }

    /**
     * Calls tween and updates the change revision of the new model
     *
     * @param t varies between 0 (start of animation) and 1 (end of animation)
     * @param context provided context
     * @returns the new model
     */
    private tweenAndUpdateChangeRevision(t: number, context: CommandExecutionContext): SModelRootImpl {
        const newRoot = this.tweenInternal(t, context);
        (newRoot as SRoot).changeRevision++;
        return newRoot;
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
    abstract tweenInternal(t: number, context: CommandExecutionContext): SModelRootImpl;
}
