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
