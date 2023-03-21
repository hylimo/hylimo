import { ExpressionMetadata } from "./expressionMetadata";
import { ASTExpressionPosition } from "./astExpressionPosition";

/**
 * Base interface for all expressions
 */

export abstract class Expression<M extends ExpressionMetadata = ExpressionMetadata> {
    /**
     * Getter for the position from the metadata
     */
    get position(): ASTExpressionPosition | undefined {
        return this.metadata.position;
    }

    /**
     * Creates a new Expression
     *
     * @param type the type of the expression
     * @param metadata the metadata of the expression
     */
    constructor(readonly type: string, readonly metadata: M) {}
}
