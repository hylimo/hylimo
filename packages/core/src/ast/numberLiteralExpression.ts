import { ExpressionMetadata } from "./expressionMetadata";
import { LiteralExpression } from "./literalExpression";

/**
 * Number expression
 */

export class NumberLiteralExpression extends LiteralExpression<number> {
    static readonly TYPE = "NumberLiteralExpression";
    /**
     * Creates a new NumberLiteralExpression consisting out of a constant number
     *
     * @param value the constant literal
     * @param metadata metadata for the expression
     */
    constructor(value: number, metadata: ExpressionMetadata) {
        super(value, NumberLiteralExpression.TYPE, metadata);
    }
}
