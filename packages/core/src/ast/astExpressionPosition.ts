/**
 * Position of an AST element in the source code
 */

export interface ASTExpressionPosition {
    /**
     * The offset of the first character of the expression, starting at 0
     */
    startOffset: number;
    /**
     * The line of the first character of the expression, starting at 0
     */
    startLine: number;
    /**
     * The column of the first character of the expression, starting at 0
     */
    startColumn: number;
    /**
     * The offset of the last character of the expression, exclusive
     */
    endOffset: number;
    /**
     * The line of the last character of the expression, inclusive, starting at 0
     */
    endLine: number;
    /**
     * The column of the last character of the expression, exclusive
     */
    endColumn: number;
}
