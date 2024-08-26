import { ParenthesisExpressionMetadata } from "./expressionMetadata.js";
import { Expression } from "./expression.js";
import { ListEntry } from "./listEntry.js";

/**
 * Base class for all invocation expressions, provides helper to generate args
 */

export abstract class AbstractInvocationExpression<
    M extends ParenthesisExpressionMetadata = ParenthesisExpressionMetadata
> extends Expression<M> {
    /**
     * all argument expressions
     */
    readonly argumentExpressions: ListEntry[];

    /**
     * Base constructor for all AbstractInvocationExpressions
     *
     * @param innerArgumentExpressions the inner argument expressions (inside the parentheses)
     * @param trailingArgumentExpressions the trailing argument expressions (functions after the parentheses)
     * @param metadata metadata for the expression
     * @param type used for serialization and debugging
     */
    constructor(
        readonly innerArgumentExpressions: ListEntry[],
        readonly trailingArgumentExpressions: ListEntry[],
        type: string,
        metadata: M
    ) {
        super(type, metadata);
        this.argumentExpressions = [...innerArgumentExpressions, ...trailingArgumentExpressions];
    }

    protected override markNoEditInternal(): void {
        super.markNoEditInternal();
        for (const arg of this.argumentExpressions) {
            arg.value.markNoEdit();
        }
    }
}
