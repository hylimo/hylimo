/**
 * Position of an AST element in the source code
 */

export interface ASTExpressionPosition {
    startOffset: number;
    startLine: number;
    startColumn: number;
    endOffset: number;
    endLine: number;
    endColumn: number;
}
