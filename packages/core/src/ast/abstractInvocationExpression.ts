import { ExpressionMetadata } from "./expressionMetadata";
import { Expression } from "./expression";
import { InvocationArgument } from "./invocationExpression";

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
    constructor(readonly argumentExpressions: InvocationArgument[], type: string, metadata: M) {
        super(type, metadata);
    }
}
