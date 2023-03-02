import { Expression } from "../ast/ast";
import { AutocompletionExpressionMetadata } from "../ast/expressionMetadata";
import { BaseObject } from "../runtime/objects/baseObject";

/**
 * An error which aborts the execution of the program and provides the context for autocompletion
 */
export class AutocompletionError extends Error {
    /**
     * Creates a new AutoCompletionError
     *
     * @param autocompletionContext the context used for autocompletion
     * @param expression the expression where to autocomplete
     */
    constructor(
        readonly autocompletionContext: BaseObject,
        readonly expression: Expression<AutocompletionExpressionMetadata>
    ) {
        super();
    }

    /**
     * Checks if the given error is an AutocompletionError
     *
     * @param error the error to check
     * @returns true if the error is an AutocompletionError
     */
    static isAutocompletionError(error: any): error is AutocompletionError {
        return "autocompletionContext" in error && error.autocompletionContext instanceof BaseObject;
    }
}
