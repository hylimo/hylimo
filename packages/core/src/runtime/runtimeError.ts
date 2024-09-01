import { Expression } from "../ast/expression.js";
import { Range } from "../ast/range.js";

/**
 * Error thrown during interpretation of a program
 */
export class RuntimeError extends Error {
    /**
     * Interpreation steps
     */
    interpretationStack: (Expression | undefined)[] = [];

    /**
     * Creates a new RuntimeError
     *
     * @param message the error message
     * @param cause the expression that caused the error, pushed to the stack
     */
    constructor(message: string, cause?: Expression) {
        super(message);
        if (cause !== undefined) {
            this.interpretationStack.push(cause);
        }
    }

    /**
     * Finds the first range in the stack
     *
     * @returns the found range of undefined if none was found
     */
    findFirstRange(): Range | undefined {
        for (const stackEntry of this.interpretationStack) {
            if (stackEntry?.range != undefined) {
                return stackEntry.range;
            }
        }
        return undefined;
    }
}
