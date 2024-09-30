import { IndexSelfInvocationExpression } from "@hylimo/core/lib/ast/indexSelfInvocationExpression.js";
import { InterpreterContext } from "@hylimo/core/lib/runtime/interpreter/interpreterContext.js";
import { LabeledValue } from "@hylimo/core/lib/runtime/objects/labeledValue.js";
import { ExecutableAbstractInvocationExpression } from "@hylimo/core/lib/runtime/ast/executableAbstractInvocationExpression.js";
import { ExecutableListEntry } from "@hylimo/core/lib/runtime/ast/executableListEntry.js";
import { ExecutableExpression } from "@hylimo/core/lib/runtime/ast/executableExpression.js";
import { assertIndex } from "@hylimo/core/lib/stdlib/typeHelpers.js";
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
        const fieldValue = targetValue.value.getFieldValue(assertIndex(indexValue), context);

        return supplyNamedArguments(fieldValue, targetValue, context, this.argumentExpressions, this.expression!);
    }
}
