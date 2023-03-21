import { ExpressionMetadata } from "./expressionMetadata";
import { Expression } from "./expression";

/**
 * Normal function expression
 */

export class FunctionExpression extends Expression {
    static readonly TYPE = "FunctionExpression";
    /**
     * Creates a new FunctionExpression consisting of a set of decorator entries and a block
     * which is executed.
     *
     * @param expressions the content of the function
     * @param decorator the decorator entries
     * @param metadata metadata for the expression
     * @param types argument types to check on invocation
     */
    constructor(
        readonly expressions: Expression[],
        readonly decorator: Map<string, string | undefined>,
        metadata: ExpressionMetadata
    ) {
        super(FunctionExpression.TYPE, metadata);
    }
}
