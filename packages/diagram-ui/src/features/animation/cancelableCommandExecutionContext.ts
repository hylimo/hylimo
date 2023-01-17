import { CommandExecutionContext } from "sprotty";

/**
 * CommandExecutionContext which supports canceling animations
 */
export interface CancelableCommandExecutionContext extends CommandExecutionContext {
    /**
     * If true, the animation is canceled and should immediately abort
     */
    canceled: boolean;
}

export namespace CancelableCommandExecutionContext {
    /**
     * Checks if the provided context is a CancelableCommandExecutionContext
     *
     * @param context the CommandExecutionContext to check
     * @returns true if it is a CancelableCommandExecutionContext
     */
    export function is(context: CommandExecutionContext): context is CancelableCommandExecutionContext {
        return "canceled" in context;
    }

    /**
     * Checks if the context is a CancelableCommandExecutionContext and is canceled
     *
     * @param context the context to check
     * @returns true if it is canceled
     */
    export function isCanceled(context: CommandExecutionContext): boolean {
        return is(context) && context.canceled;
    }

    /**
     * Marks the provided context as canceled
     *
     * @param context the context of the animation to cancel
     */
    export function setCanceled(context: CancelableCommandExecutionContext) {
        context.canceled = true;
        context.duration = 0;
    }
}
