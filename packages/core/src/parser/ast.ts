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
export class BlockExpression extends Expression {
    /**
     * Creates a new BlockExpression consisting out of a list of Expressions
     *
     * @param expressions subexpressions to be evaluated with this expression
     * @param position if defined, where in the source code the expression is
     */
    constructor(readonly expressions: Expression[], position?: ASTExpressionPosition) {
        super(position);
    }
}

/**
 * Base class for all literal expressions
 *
 * @param T the type of the literal
 */
export abstract class LiteralExpression<T> extends Expression {
    /**
     * Creates a new LiteralExpression consisting out of a constant literalof t
     *
     * @param value the constant literal
     * @param position if defined, where in the source code the expression is
     */
    constructor(readonly value: T, position?: ASTExpressionPosition) {
        super(position);
    }
}

/**
 * String expression
 */
export class StringLiteralExpression extends LiteralExpression<string> {}

/**
 * Number expression
 */
export class NumberLiteralExpression extends LiteralExpression<number> {}

/**
 * Expression evaluating to a constant natively defined literal
 *
 * @param T the type of the literal
 */
export class ConstLiteralExpression<T> extends LiteralExpression<T> {}

/**
 * Base class for function (normal, native) expressions
 * Evaluates to a bound function instance
 */
export abstract class AbstractFunctionExpression extends Expression {
    /**
     * Creates a new AbstractFunctionExpression having a set of decorator entries
     *
     * @param decorator the decorator entries
     * @param position if defined, where in the source code the expression is
     */
    constructor(readonly decorator: Map<string, string | undefined>, position?: ASTExpressionPosition) {
        super(position);
    }
}

/**
 * Normal function expression
 */
export class FunctionExpression extends AbstractFunctionExpression {
    /**
     * Creates a new FunctionExpression consisting of a set of decorator entries and a block
     * which is executed.
     *
     * @param block the statement executed on function execution
     * @param decorator the decorator entries
     * @param position if defined, where in the source code the expression is
     */
    constructor(
        readonly block: BlockExpression,
        decorator: Map<string, string | undefined>,
        position?: ASTExpressionPosition
    ) {
        super(decorator, position);
    }
}

/**
 * Native (JS) function expression
 * Never the result of the parser
 */
export class NativeFunctionExpression extends AbstractFunctionExpression {
    /**
     * Creates a new NativeFunctionExpression consiting of a set of decorator entires
     * and a callback which is executed to get the result of the function
     * TODO: fix callback type
     *
     * @param callback executed to get the result of the function
     * @param decorator the decorator entries
     * @param position if defined, where in the source code the expression is
     */
    constructor(callback: any, decorator: Map<string, string | undefined>, position?: ASTExpressionPosition) {
        super(decorator, position);
    }
}

/**
 * Function invocation expression
 * Evaluates to the result of the called function
 */
export class InvocationExpression extends Expression {
    /**
     * Creates a new InvocationExpression consisting of an expression of which the result should be invoked,
     * and a set of optionally named expressions as arguments
     *
     * @param functionExpression evaluated to provide the function to invoke
     * @param argumentExpressions evaluated to provide arguments
     * @param position if defined, where in the source code the expression is
     */
    constructor(
        readonly functionExpression: Expression,
        readonly argumentExpressions: InvocationArgument[],
        position?: ASTExpressionPosition
    ) {
        super(position);
    }
}

/**
 * Field access expression
 * Evalueates to the value of the field
 */
export class FieldAccessExpression extends Expression {
    /**
     * Creates a new IdentifierExpression consisting of a target and a field to access
     *
     * @param target evaluated to provide the target of the field access
     * @param field name or index of the field to access
     * @param position if defined, where in the source code the expression is
     */
    constructor(readonly target: Expression, readonly field: string | number, position?: ASTExpressionPosition) {
        super(position);
    }
}

/**
 * Identifier expression
 * Equivalent to a field access expression on the local scope
 */
export class IdentifierExpression extends Expression {
    /**
     * Creates a new IdentifierExpression consisting of an identifier
     * @param identifier the name of the identifier
     * @param position if defined, where in the source code the expression is
     */
    constructor(readonly identifier: string, position?: ASTExpressionPosition) {
        super(position);
    }
}

/**
 * Argument for a function invocation
 */
export interface InvocationArgument {
    /**
     * The optional name of the argument
     */
    name?: string;
    /**
     * Evaluated to be the value of the argument
     */
    value: Expression;
}
