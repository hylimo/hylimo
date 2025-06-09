import type {
    IndexSelfInvocationExpression,
    ExecutableListEntry,
    ExecutableExpression,
    InterpreterContext,
    LabeledValue
} from "@hylimo/core";
import { ExecutableAbstractInvocationExpression, assertIndex } from "@hylimo/core";
import { supplyNamedArguments } from "./completionGenerator.js";

/**
 * Executable SelfInvocationExpression
 */
export class CompletableIndexSelfInvocationExpression extends ExecutableAbstractInvocationExpression<IndexSelfInvocationExpression> {
    /**
     * Creates a new ExecutableInvocationExpression consisting of an expression of which the result should be invoked,
     * and a set of optionally named expressions as arguments
     *
     * @param expression the expression this represents
     * @param argumentExpressions evaluated to provide arguments
     * @param target evaluated to provide the function to invoke
     * @param index evaluated to provide the index to access on target
     */
    constructor(
        expression: IndexSelfInvocationExpression | undefined,
        argumentExpressions: ExecutableListEntry[],
        readonly target: ExecutableExpression<any>,
        readonly index: ExecutableExpression<any>
    ) {
        super(expression, argumentExpressions);
    }

    override evaluateInternal(context: InterpreterContext): LabeledValue {
        const targetValue = this.target.evaluateWithSource(context);
        const indexValue = this.index.evaluate(context).value;
        const fieldValue = targetValue.value.getSelfFieldValue(assertIndex(indexValue), context);

        return supplyNamedArguments(fieldValue, targetValue, context, this.argumentExpressions, this.expression!);
    }
}
