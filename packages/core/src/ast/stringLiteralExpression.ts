import { ExpressionMetadata } from "./expressionMetadata";
import { LiteralExpression } from "./literalExpression";

/**
 * String expression
 */
export class StringLiteralExpression extends LiteralExpression<string> {
    static readonly TYPE = "StringLiteralExpression";
    /**
     * Creates a new StringLiteralExpression consisting out of a constant string
     *
     * @param value the constant literal
     * @param metadata metadata for the expression
     */
    constructor(value: string, metadata: ExpressionMetadata) {
        super(value, StringLiteralExpression.TYPE, metadata);
    }
}
