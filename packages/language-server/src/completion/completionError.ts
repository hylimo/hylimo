import type { CompletionItem } from "./completionItem.js";
import type { Range } from "@hylimo/core";

/**
 * An error which aborts the execution of the program and provides the context for completion
 */
export class CompletionError extends Error {
    /**
     * Creates a new CompletionError
     *
     * @param completionItems the items to provide for completion
     * @param completionRange the range in which the completion should occur
     */
    constructor(
        readonly completionItems: CompletionItem[],
        readonly completionRange: Range
    ) {
        super();
    }

    /**
     * Checks if the given error is an CompletionError
     *
     * @param error the error to check
     * @returns true if the error is an CompletionError
     */
    static isCompletionError(error: any): error is CompletionError {
        return "completionItems" in error && "completionRange" in error;
    }
}
