import { ExpressionMetadata } from "./expressionMetadata";
import { ASTExpressionPosition } from "./astExpressionPosition";

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
    constructor(readonly type: string, readonly metadata: M) {}

    /**
     * Marks the expression as read only
     * If the expression is already read only, this method does nothing
     */
    markReadOnly(): void {
        if (this.metadata.isEditable) {
            this.markReadOnlyInternal();
        }
    }

    /**
     * Marks the expression as read only
     * Should be overwritten to mark subexpressions as read only
     */
    protected markReadOnlyInternal(): void {
        this.metadata.isEditable = false;
    }
}
