import type { InterpreterContext } from "../interpreter/interpreterContext.js";
import type { LabeledValue } from "../objects/labeledValue.js";
import { ExecutableExpression } from "./executableExpression.js";

/**
 * Executable expression which evaluates to the current scope (used as the implicit `self` argument).
 *
 * As it carries no per-invocation state and simply reads {@link InterpreterContext.currentScope} at
 * evaluation time, a single shared instance ({@link selfExpression}) can be reused for every
 * invocation, avoiding a per-call allocation of a wrapper expression.
 */
class ExecutableSelfExpression extends ExecutableExpression<never> {
    /**
     * Creates a new ExecutableSelfExpression, which has no associated syntactic expression
     */
    constructor() {
        super(undefined);
    }

    override evaluateInternal(context: InterpreterContext): LabeledValue {
        return { value: context.currentScope, source: undefined };
    }
}

/**
 * Shared singleton instance of {@link ExecutableSelfExpression}.
 * Evaluates to the current scope with no source, matching the previous per-call
 * `new ExecutableConstExpression({ value: context.currentScope, source: undefined })`.
 */
export const selfExpression = new ExecutableSelfExpression();
