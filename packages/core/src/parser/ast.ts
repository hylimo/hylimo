import { IToken } from "chevrotain";

/**
 * Position of an AST element in the source code
 */
export interface ASTExpressionPosition {
    /**
     * The token where the expression starts (inclusive)
     */
    startToken: IToken;
    /**
     * The token where the expression ends (inclusive)
     */
    endToken: IToken;
}

/**
 * Base class for all AST elements
 */
export abstract class Expression {
    /**
     * Base constructor for all Expressions
     * @param position if defined, where in the source code the expression is
     */
    constructor(readonly position?: ASTExpressionPosition) {}
}

/**
 * Expression consisting of multiple expressions
 * Evaluates to the result of the last expression
 */
export class BlockExpression extends Expression {}

/**
 * Base class for all literal expressions
 */
export abstract class LiteralExpression extends Expression {}

/**
 * String expression
 */
export class StringLiteralExpression extends LiteralExpression {}

/**
 * Number expression
 */
export class NumberLiteralExpression extends LiteralExpression {}

/**
 * Expression evaluating to a constant natively defined literal
 */
export class ConstLiteralExpression extends LiteralExpression {}

/**
 * Base class for function (normal, native) expressions
 * Evaluates to a bound function instance
 */
export abstract class AbstractFunctionExpression extends Expression {}

/**
 * Normal function expression
 */
export class FunctionExpression extends AbstractFunctionExpression {}

/**
 * Native (JS) function expression
 * Never the result of the parser
 */
export class NativeFunctionExpression extends AbstractFunctionExpression {}

/**
 * Function invocation expression
 * Evaluates to the result of the called function
 */
export class InvocationExpression {}

/**
 * Field access expression
 * Evalueates to the value of the field
 */
export class FieldAccessExpression {}

/**
 * Identifier expression
 * Equivalent to a field access expression on the local scope
 */
export class IdentifierExpression {}
