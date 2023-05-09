import { ExpressionMetadata } from "./expressionMetadata";
import { Expression } from "./expression";
import { AbstractInvocationExpression } from "./abstractInvocationExpression";
import { ListEntry } from "./listEntry";

/*
 * Function invocation expression
 * Evaluates to the result of the called function
 */
export class InvocationExpression extends AbstractInvocationExpression {
    static readonly TYPE = "InvocationExpression";
    /**
     * Creates a new InvocationExpression consisting of an expression of which the result should be invoked,
     * and a set of optionally named expressions as arguments
     *
     * @param target evaluated to provide the function to invoke
     * @param argumentExpressions evaluated to provide arguments
     * @param metadata metadata for the expression
     */
    constructor(readonly target: Expression, argumentExpressions: ListEntry[], metadata: ExpressionMetadata) {
        super(argumentExpressions, InvocationExpression.TYPE, metadata);
    }

    protected override markNoEditInternal(): void {
        super.markNoEditInternal();
        this.target.markNoEdit();
        for (const argument of this.argumentExpressions) {
            argument.value.markNoEdit();
        }
    }
}
