import { CommandExecutionContext } from "sprotty";

/**
 * CommandExecutionContext which supports canceling animations
 */
export interface CancelableCommandExecutionContext extends CommandExecutionContext {
    /**
     * Sequence number for command execution contexts
     */
    commandSequenceNumber: number;
    /**
     * The state of the cancelation
     * Should be shared between all CommandExecutionContexts
     */
    cancelState: CancelState;
}

/**
 * The state of the cancelation
 */
export interface CancelState {
    /**
     * Cancel all animations with lesser or equal sequence numbers
     */
    cancelUntil: number;
    /**
     * Skip all animations with lesser or equal sequence numbers
     */
    skipUntil: number;
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
        return is(context) && context.cancelState.cancelUntil >= context.commandSequenceNumber;
    }

    /**
     * Checks if the context is a CancelableCommandExecutionContext and is canceled and skipped
     *
     * @param context the context to check
     * @returns true if it is canceled AND skipped
     */
    export function isCanceledAndSkipped(context: CommandExecutionContext): boolean {
        return is(context) && isCanceled(context) && context.cancelState.skipUntil >= context.commandSequenceNumber;
    }

    /**
     * Marks the provided context as canceled
     *
     * @param context the context of the animation to cancel
     * @param skipToFinalState true if the animation should be skipped to the final state
     * @param cancelUntil the sequence number until which the animation should be canceled
     */
    export function setCanceled(
        context: CancelableCommandExecutionContext,
        skipToFinalState: boolean,
        cancelUntil: number
    ) {
        context.cancelState.cancelUntil = cancelUntil;
        if (skipToFinalState) {
            context.cancelState.skipUntil = cancelUntil;
        }
    }
}
