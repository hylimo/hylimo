import { CompletionExpressionMetadata } from "./expressionMetadata";
import { Expression } from "./expression";

/**
 * Field access expression
 * Evalueates to the value of the field
 */

export class FieldAccessExpression extends Expression<CompletionExpressionMetadata> {
    static readonly TYPE = "FieldAccessExpression";
    /**
     * Creates a new IdentifierExpression consisting of a target and a field to access
     *
     * @param target evaluated to provide the target of the field access
     * @param name name or index of the field to access
     * @param metadata metadata for the expression
     */
    constructor(readonly name: string | number, readonly target: Expression, metadata: CompletionExpressionMetadata) {
        super(FieldAccessExpression.TYPE, metadata);
    }

    protected override markNoEditInternal(): void {
        super.markNoEditInternal();
        this.target.markNoEdit();
    }
}
