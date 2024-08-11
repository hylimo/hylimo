import { ExpressionMetadata } from "./expressionMetadata.js";
import { Expression } from "./expression.js";

/**
 * Destructuring expression
 * Evaluates the right side, and assigns all names on the left side the value at their index
 */

export class DestructuringExpression extends Expression {
    static readonly TYPE = "DestructuringExpression";
    /**
     * Creates a new DestructuringExpression consisting of a set of names to assign, and the value to destructure
     *
     * @param names the names of the field on the current context to assign
     * @param value the right hand side, provides the values
     * @param metadata metadata for the expression
     */
    constructor(readonly names: string[], readonly value: Expression, metadata: ExpressionMetadata) {
        super(DestructuringExpression.TYPE, metadata);
    }

    protected override markNoEditInternal(): void {
        super.markNoEditInternal();
        this.value.markNoEdit();
    }
}
