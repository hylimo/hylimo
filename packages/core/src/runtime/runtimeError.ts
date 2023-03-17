import { Expression } from "../ast/ast";
import { ASTExpressionPosition } from "../ast/astExpressionPosition";

/**
 * Error thrown during interpretation of a program
 */
export class RuntimeError extends Error {
    /**
     * Interpreation steps
     */
    interpretationStack: Expression[] = [];

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
     * Finds the first position in the stack
     *
     * @returns the found position of undefined if none was found
     */
    findFirstPosition(): ASTExpressionPosition | undefined {
        for (const stackEntry of this.interpretationStack) {
            if (stackEntry.position) {
                return stackEntry.position;
            }
        }
        return undefined;
    }
}
