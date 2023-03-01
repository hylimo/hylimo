import { AbstractInvocationExpression } from "../../ast/ast";
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
    constructor(expression: T, readonly argumentExpressions: ExecutableInvocationArgument[]) {
        super(expression);
    }
}

/**
 * Executable version of InvocationArgument
 */
export interface ExecutableInvocationArgument {
    /**
     * The optional name of the argument
     */
    name?: string;
    /**
     * Evaluated to be the value of the argument
     */
    value: ExecutableExpression<any>;
}
