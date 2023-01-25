import { ASTExpressionPosition, Expression } from "../parser/ast";

/**
 * Error thrown during interpretation of a program
 */
export class RuntimeError extends Error {
    /**
     * Interpreation steps
     */
    interpretationStack: Expression[] = [];

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
