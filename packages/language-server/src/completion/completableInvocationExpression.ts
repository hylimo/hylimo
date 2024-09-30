import { InvocationExpression } from "@hylimo/core/lib/ast/invocationExpression.js";
import { InterpreterContext } from "@hylimo/core/lib/runtime/interpreter/interpreterContext.js";
import { LabeledValue } from "@hylimo/core/lib/runtime/objects/labeledValue.js";
import { ExecutableAbstractInvocationExpression } from "@hylimo/core/lib/runtime/ast/executableAbstractInvocationExpression.js";
import { ExecutableListEntry } from "@hylimo/core/lib/runtime/ast/executableListEntry.js";
import { ExecutableExpression } from "@hylimo/core/lib/runtime/ast/executableExpression.js";
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
