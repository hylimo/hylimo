import { ExpressionMetadata } from "./expressionMetadata.js";
import { Expression } from "./expression.js";
import { ListEntry } from "./listEntry.js";

/**
 * Base class for all invocation expressions, provides helper to generate args
 */

export abstract class AbstractInvocationExpression<
    M extends ExpressionMetadata = ExpressionMetadata
> extends Expression<M> {
    /**
     * Base constructor for all AbstractInvocationExpressions
     * @param metadata metadata for the expression
     * @param type used for serialization and debugging
     */
    constructor(readonly argumentExpressions: ListEntry[], type: string, metadata: M) {
        super(type, metadata);
    }

    protected override markNoEditInternal(): void {
        super.markNoEditInternal();
        for (const arg of this.argumentExpressions) {
            arg.value.markNoEdit();
        }
    }
}
