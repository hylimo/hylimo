import { CompletionExpressionMetadata } from "./expressionMetadata.js";
import { Expression } from "./expression.js";
import { AbstractInvocationExpression } from "./abstractInvocationExpression.js";
import { ListEntry } from "./listEntry.js";

/**
 * Function invocation which provides the self parameter automatically
 * Accesses the field name on target, invokes it and provides target as self
 */

export class SelfInvocationExpression extends AbstractInvocationExpression<CompletionExpressionMetadata> {
    static readonly TYPE = "SelfInvocationExpression";
    /**
     * Creates a new InvocationExpression consisting of an expression of which the result should be invoked,
     * and a set of optionally named expressions as arguments
     *
     * @param target evaluated to provide the function to invoke
     * @param name the name or index to access on target
     * @param argumentExpressions evaluated to provide arguments
     * @param metadata metadata for the expression
     */
    constructor(
        readonly name: string | number,
        readonly target: Expression,
        argumentExpressions: ListEntry[],
        metadata: CompletionExpressionMetadata
    ) {
        super(argumentExpressions, SelfInvocationExpression.TYPE, metadata);
    }

    protected override markNoEditInternal(): void {
        super.markNoEditInternal();
        this.target.markNoEdit();
        for (const argument of this.argumentExpressions) {
            argument.value.markNoEdit();
        }
    }
}
