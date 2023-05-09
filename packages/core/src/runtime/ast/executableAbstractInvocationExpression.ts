import { AbstractInvocationExpression } from "../../ast/abstractInvocationExpression";
import { ExecutableListEntry } from "./executableListEntry";
import { ExecutableExpression } from "./executableExpression";

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
    constructor(expression: T | undefined, readonly argumentExpressions: ExecutableListEntry[]) {
        super(expression);
    }
}
