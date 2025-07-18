import type { ExpressionMetadata } from "./expressionMetadata.js";
import { Expression } from "./expression.js";

/**
 * Base class for all literal expressions
 *
 * @template T the type of the literal
 */

export abstract class LiteralExpression<T> extends Expression {
    /**
     * Creates a new LiteralExpression consisting out of a constant literal of T
     *
     * @param value the constant literal
     * @param metadata metadata for the expression
     * @param type used for serialization and debugging
     */
    constructor(
        readonly value: T,
        type: string,
        metadata: ExpressionMetadata
    ) {
        super(type, metadata);
    }
}
