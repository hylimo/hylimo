import {
    ExecutableAbstractInvocationExpression,
    InvocationExpression,
    ExecutableListEntry,
    ExecutableExpression,
    InterpreterContext,
    LabeledValue
} from "@hylimo/core";
import { supplyNamedArguments } from "./completionGenerator.js";

/**
 * Executable InvocationExpression
 */
export class CompletableInvocationExpression extends ExecutableAbstractInvocationExpression<InvocationExpression> {
    /**
     * Creates a new InvocationExpression consisting of an expression of which the result should be invoked,
     * and a set of optionally named expressions as arguments
     *
     * @param expression the expression this represents
     * @param argumentExpressions evaluated to provide arguments
     * @param target evaluated to provide the function to invoke
     */
    constructor(
        expression: InvocationExpression | undefined,
        argumentExpressions: ExecutableListEntry[],
        readonly target: ExecutableExpression<any>
    ) {
        super(expression, argumentExpressions);
    }

    override evaluateInternal(context: InterpreterContext): LabeledValue {
        const targetValue = this.target.evaluate(context).value;

        return supplyNamedArguments(
            targetValue,
            { value: targetValue },
            context,
            this.argumentExpressions,
            this.expression!
        );
    }
}
