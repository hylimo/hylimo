import { AutocompletionItem } from "./autocompletionItem";

/**
 * An error which aborts the execution of the program and provides the context for autocompletion
 */
export class AutocompletionError extends Error {
    /**
     * Creates a new AutoCompletionError
     *
     * @param autocompletionItems the items to provide for autocompletion
     */
    constructor(readonly autocompletionItems: AutocompletionItem[]) {
        super();
    }

    /**
     * Checks if the given error is an AutocompletionError
     *
     * @param error the error to check
     * @returns true if the error is an AutocompletionError
     */
    static isAutocompletionError(error: any): error is AutocompletionError {
        return "autocompletionItems" in error;
    }
}
