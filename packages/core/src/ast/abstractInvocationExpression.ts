import { ExpressionMetadata } from "./expressionMetadata";
import { Expression } from "./expression";
import { ListEntry } from "./listEntry";

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

    protected override markReadOnlyInternal(): void {
        super.markReadOnlyInternal();
        for (const arg of this.argumentExpressions) {
            arg.value.markReadOnly();
        }
    }
}
