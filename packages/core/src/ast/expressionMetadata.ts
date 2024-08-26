import { Range } from "./range.js";

/**
 * Metadata for Expressions
 * Provides the optional range, and an isEditable flag
 */
export interface ExpressionMetadata {
    /**
     * The range of the expression
     */
    readonly range: Range;
    /**
     * If false, the expression should not be edited
     */
    isEditable: boolean;
}

export namespace ExpressionMetadata {
    /**
     * Checks if a ExpressionMetadata is editable
     *
     * @param metadata the metadata to check
     * @returns true if metadata is undefined, its range is undefined and isEditable is true
     */
    export function isEditable(metadata?: ExpressionMetadata): boolean {
        return metadata?.isEditable === true && metadata?.range != undefined;
    }
}

/**
 * Metadata for Expressions with additional data for complete
 */
export interface CompletionExpressionMetadata extends ExpressionMetadata {
    /**
     * The range of the part of the expression which is affected by complete.
     * E.g. for an FieldAccessExpression, this would be the range of the dot and the field name
     */
    completionRange: Range;
    /**
     * The range of the identifier of the expression (the identifier which should be replaced on complete)
     */
    identifierRange: Range;
}

/**
 * Metadata for Expressions with additional data for parentheses
 */
export interface ParenthesisExpressionMetadata extends ExpressionMetadata {
    /**
     * The range of the part of the expression which is contained in the parentheses (including the parentheses)
     * e.g. the call brackets of a function invocation
     */
    parenthesisRange: Range;
}
