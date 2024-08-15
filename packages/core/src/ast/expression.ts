import { ExpressionMetadata } from "./expressionMetadata.js";
import { ASTExpressionPosition } from "./astExpressionPosition.js";

/**
 * Base interface for all expressions
 */

export abstract class Expression<M extends ExpressionMetadata = ExpressionMetadata> {
    /**
     * Getter for the position from the metadata
     */
    get position(): ASTExpressionPosition {
        return this.metadata.position;
    }

    /**
     * Creates a new Expression
     *
     * @param type the type of the expression
     * @param metadata the metadata of the expression
     */
    constructor(
        readonly type: string,
        readonly metadata: M
    ) {}

    /**
     * Marks the expression as not edxitable
     * If the expression is already not editable, this method does nothing
     */
    markNoEdit(): void {
        if (this.metadata.isEditable) {
            this.markNoEditInternal();
        }
    }

    /**
     * Marks the expression as not editable
     * Should be overwritten to mark subexpressions as not editable
     */
    protected markNoEditInternal(): void {
        this.metadata.isEditable = false;
    }
}
