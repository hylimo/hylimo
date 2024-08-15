import { AbstractInvocationExpression } from "../../ast/abstractInvocationExpression.js";
import { ExecutableListEntry } from "./executableListEntry.js";
import { ExecutableExpression } from "./executableExpression.js";

/**
 * Executable AbstractInvocationExpression
 */
export abstract class ExecutableAbstractInvocationExpression<
    T extends AbstractInvocationExpression
> extends ExecutableExpression<T> {
    /**
     * Base constructor for all AbstractInvocationExpressions
     *
     * @param expression the expression this represents
     * @param argumentExpressions the expressions to execute
     */
    constructor(
        expression: T | undefined,
        readonly argumentExpressions: ExecutableListEntry[]
    ) {
        super(expression);
    }
}
