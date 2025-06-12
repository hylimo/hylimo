import type {
    FieldSelfInvocationExpression,
    ExecutableListEntry,
    ExecutableExpression,
    InterpreterContext,
    LabeledValue
} from "@hylimo/core";
import { ExecutableAbstractInvocationExpression } from "@hylimo/core";
import { supplyNamedArguments } from "./completionGenerator.js";

/**
 * Provides enhanced autocompletion for `this["hello"](…)`, i.e. by autocompleting `…` with documented named arguments of the hello function
 */
export class CompletableFieldSelfInvocationExpression extends ExecutableAbstractInvocationExpression<FieldSelfInvocationExpression> {
    /**
     * Creates a new CompletableFieldSelfInvocationExpression consisting of an expression of which the result should be invoked,
     * and a set of optionally named expressions as arguments
     *
     * @param expression the expression this represents
     * @param argumentExpressions evaluated to provide arguments
     * @param target evaluated to provide the function to invoke
     * @param name the name of the field to access
     */
    constructor(
        expression: FieldSelfInvocationExpression | undefined,
        argumentExpressions: ExecutableListEntry[],
        readonly target: ExecutableExpression<any>,
        readonly name: string | number
    ) {
        super(expression, argumentExpressions);
    }

    override evaluateInternal(context: InterpreterContext): LabeledValue {
        const targetValue = this.target.evaluateWithSource(context);
        const fieldValue = targetValue.value.getFieldValue(this.name, context);

        return supplyNamedArguments(fieldValue, targetValue, context, this.argumentExpressions, this.expression!);
    }
}
