import { ExpressionMetadata } from "./expressionMetadata";
import { Expression } from "./expression";

/**
 * Normal function expression
 */

export class FunctionExpression extends Expression {
    static readonly TYPE = "FunctionExpression";
    /**
     * Creates a new FunctionExpression consisting of  a block which is executed.
     *
     * @param expressions the content of the function
     * @param metadata metadata for the expression
     * @param types argument types to check on invocation
     */
    constructor(readonly expressions: Expression[], metadata: ExpressionMetadata) {
        super(FunctionExpression.TYPE, metadata);
    }

    override markNoEditInternal(): void {
        super.markNoEditInternal();
        for (const expression of this.expressions) {
            expression.markNoEdit();
        }
    }
}
