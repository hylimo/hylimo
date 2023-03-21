import { Expression } from "../../ast/expression";
import { ExecutableExpression } from "./executableExpression";

/**
 * Executable AbstractFunctionExpression
 */
export abstract class ExecutableAbstractFunctionExpression<
    T extends Expression = Expression
> extends ExecutableExpression<T> {
    /**
     * Creates a new ExecutableAbstractFunctionExpression
     *
     * @param expression the expression this represents
     * @param decorator the decorator of the function
     */
    constructor(expression: T | undefined, readonly decorator: Map<string, string | undefined>) {
        super(expression);
    }
}
