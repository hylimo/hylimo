import { CommandExecutionContext } from "sprotty";

/**
 * CommandExecutionContext which supports canceling animations
 */
export interface CancelableCommandExecutionContext extends CommandExecutionContext {
    /**
     * The CancelState of the animation
     */
    cancelState: CancelState;
}

/**
 * The state of the cancelation
 */
export enum CancelState {
    /**
     * The animation is running and not canceled
     */
    RUNNING = 0,
    /**
     * The animation is canceled, but should NOT be skipped to the final state
     */
    CANCELED = 1,
    /**
     * The animation is canceled and should be skipped to the final state
     */
    CANCELED_AND_SKIPPED = 2
}

export namespace CancelableCommandExecutionContext {
    /**
     * Checks if the provided context is a CancelableCommandExecutionContext
     *
     * @param context the CommandExecutionContext to check
     * @returns true if it is a CancelableCommandExecutionContext
     */
    export function is(context: CommandExecutionContext): context is CancelableCommandExecutionContext {
        return "cancelState" in context;
    }

    /**
     * Checks if the context is a CancelableCommandExecutionContext and is canceled
     *
     * @param context the context to check
     * @returns true if it is canceled
     */
    export function isCanceled(context: CommandExecutionContext): boolean {
        return is(context) && context.cancelState != CancelState.RUNNING;
    }

    /**
     * Checks if the context is a CancelableCommandExecutionContext and is canceled and skipped
     *
     * @param context the context to check
     * @returns true if it is canceled AND skipped
     */
    export function isCanceledAndSkipped(context: CommandExecutionContext): boolean {
        return is(context) && context.cancelState == CancelState.CANCELED_AND_SKIPPED;
    }

    /**
     * Marks the provided context as canceled
     *
     * @param context the context of the animation to cancel
     * @param skipToFinalState true if the animation should be skipped to the final state
     */
    export function setCanceled(context: CancelableCommandExecutionContext, skipToFinalState: boolean) {
        if (skipToFinalState) {
            context.cancelState = CancelState.CANCELED_AND_SKIPPED;
        } else {
            context.cancelState = CancelState.CANCELED;
        }
        context.duration = 0;
    }
}
