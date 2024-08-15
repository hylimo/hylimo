import { ExpressionMetadata } from "./expressionMetadata.js";
import { Expression } from "./expression.js";

/**
 * Expression which evaluates and returns an inner expression
 */

export class BracketExpression extends Expression {
    static readonly TYPE = "BracketExpression";
    /**
     * Creates a new BracketExpression consisting of an inner expression
     *
     * @param expression the inner expression
     * @param metadata metadata for the expression
     */
    constructor(
        readonly expression: Expression,
        metadata: ExpressionMetadata
    ) {
        super(BracketExpression.TYPE, metadata);
    }

    protected override markNoEditInternal(): void {
        super.markNoEditInternal();
        this.expression.markNoEdit();
    }
}
