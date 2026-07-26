import type { InvocationExpression } from "../../ast/invocationExpression.js";
import type { InterpreterContext } from "../interpreter/interpreterContext.js";
import type { LabeledValue } from "../objects/labeledValue.js";
import { SemanticFieldNames } from "../semanticFieldNames.js";
import { ExecutableAbstractInvocationExpression } from "./executableAbstractInvocationExpression.js";
import type { ExecutableListEntry } from "./executableListEntry.js";
import type { ExecutableExpression } from "./executableExpression.js";
import { selfExpression } from "./executableSelfExpression.js";

/**
 * Executable InvocationExpression
 */
export class ExecutableInvocationExpression extends ExecutableAbstractInvocationExpression<InvocationExpression> {
    /**
     * The argument list passed to invoke, with the implicit `self` argument (the current scope)
     * prepended. As the self argument is provided by a shared, stateless expression, this list is
     * constant for this invocation and can be built once instead of on every evaluation.
     */
    private readonly invocationArguments: ExecutableListEntry[];

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
        this.invocationArguments = [{ value: selfExpression, name: SemanticFieldNames.SELF }, ...argumentExpressions];
    }

    override evaluateInternal(context: InterpreterContext): LabeledValue {
        const targetValue = this.target.evaluate(context).value;
        return targetValue.invoke(this.invocationArguments, context, undefined, this.expression);
    }
}
