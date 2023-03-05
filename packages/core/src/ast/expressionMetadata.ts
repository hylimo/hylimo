import { ASTExpressionPosition } from "./astExpressionPosition";

/**
 * Metadata for Expressions
 * Provides the optional position, and an isEditable flag
 */
export interface ExpressionMetadata {
    /**
     * The position of the expression
     */
    readonly position?: ASTExpressionPosition;
    /**
     * If false, the expression should not be edited
     */
    readonly isEditable: boolean;
}

export namespace ExpressionMetadata {
    /**
     * Constant noEdit no position metadata
     */
    export const NO_EDIT: ExpressionMetadata = Object.freeze({ isEditable: false });

    /**
     * Checks if a ExpressionMetadata is editable
     *
     * @param metadata the metadata to check
     * @returns true if metadata is undefined, its position is undefined and isEditable is true
     */
    export function isEditable(metadata?: ExpressionMetadata): boolean {
        return metadata?.isEditable === true && metadata?.position != undefined;
    }
}

/**
 * Metadata for Expressions with additional data for complete
 */
export interface CompletionExpressionMetadata extends ExpressionMetadata {
    /**
     * The position of the part of the expression which is affected by complete.
     * E.g. for an FieldAccessExpression, this would be the position of the dot and the field name
     */
    completionPosition?: ASTExpressionPosition;
    /**
     * The position of the identifier of the expression (the identifier which should be replaced on complete)
     */
    identifierPosition?: ASTExpressionPosition;
}
