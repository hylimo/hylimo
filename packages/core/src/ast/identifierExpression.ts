import { CompletionExpressionMetadata } from "./expressionMetadata";
import { Expression } from "./expression";

/**
 * Identifier expression
 * Equivalent to a field access expression on the local scope
 */

export class IdentifierExpression extends Expression<CompletionExpressionMetadata> {
    static readonly TYPE = "IdentifierExpression";
    /**
     * Creates a new IdentifierExpression consisting of an identifier
     * @param identifier the name of the identifier
     * @param metadata metadata for the expression
     */
    constructor(readonly identifier: string, metadata: CompletionExpressionMetadata) {
        super(IdentifierExpression.TYPE, metadata);
    }
}
