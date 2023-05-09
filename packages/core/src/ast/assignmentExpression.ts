import { CompletionExpressionMetadata } from "./expressionMetadata";
import { Expression } from "./expression";

/**
 * Assignment Expression
 * Evaluates to the assigned value
 */

export class AssignmentExpression extends Expression<CompletionExpressionMetadata> {
    static readonly TYPE = "AssignmentExpression";
    /**
     * Creates a new AssignmentExpression consisting of a value, a field, and an optional target on which the
     * identifier is accessed.
     *
     * @param name name of the assigned field
     * @param target evaluates to the object where the field is located on, if not present, the scope is used
     * @param value evaluates to the assigned value
     * @param metadata metadata for the expression
     */
    constructor(
        readonly name: string,
        readonly target: Expression | undefined,
        readonly value: Expression,
        metadata: CompletionExpressionMetadata
    ) {
        super(AssignmentExpression.TYPE, metadata);
    }

    protected override markNoEditInternal(): void {
        super.markNoEditInternal();
        this.value.markNoEdit();
        if (this.target != undefined) {
            this.target.markNoEdit();
        }
    }
}
