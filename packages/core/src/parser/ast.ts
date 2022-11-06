import { IToken } from "chevrotain";

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

/**
 * Base class for all AST elements
 */
export abstract class Expression {
    /**
     * Base constructor for all Expressions
     * @param position if defined, where in the source code the expression is
     * @param type used for serialization and debugging
     */
    constructor(readonly type: string, readonly position?: ASTExpressionPosition) {}
}

/**
 * Base class for all literal expressions
 *
 * @param T the type of the literal
 */
export abstract class LiteralExpression<T> extends Expression {
    /**
     * Creates a new LiteralExpression consisting out of a constant literal of T
     *
     * @param value the constant literal
     * @param position if defined, where in the source code the expression is
     * @param type used for serialization and debugging
     */
    constructor(readonly value: T, type: string, position?: ASTExpressionPosition) {
        super(type, position);
    }
}

/**
 * String expression
 */
export class StringLiteralExpression extends LiteralExpression<string> {
    /**
     * Creates a new StringLiteralExpression consisting out of a constant string
     *
     * @param value the constant literal
     * @param position if defined, where in the source code the expression is
     */
    constructor(value: string, position?: ASTExpressionPosition) {
        super(value, "StringLiteralExpression", position);
    }
}

/**
 * Number expression
 */
export class NumberLiteralExpression extends LiteralExpression<number> {
    /**
     * Creates a new NumberLiteralExpression consisting out of a constant number
     *
     * @param value the constant literal
     * @param position if defined, where in the source code the expression is
     */
    constructor(value: number, position?: ASTExpressionPosition) {
        super(value, "NumberLiteralExpression", position);
    }
}

/**
 * Expression evaluating to a constant natively defined literal
 *
 * @param T the type of the literal
 */
export class ConstLiteralExpression<T> extends LiteralExpression<T> {
    /**
     * Creates a new ConstLiteralExpression consisting out of a constant T
     *
     * @param value the constant literal
     * @param position if defined, where in the source code the expression is
     */
    constructor(value: T, position?: ASTExpressionPosition) {
        super(value, "ConstLiteralExpression", position);
    }
}

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
     * @param type used for serialization and debugging
     */
    constructor(readonly decorator: Map<string, string | undefined>, type: string, position?: ASTExpressionPosition) {
        super(type, position);
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
     * @param expressions the content of the function
     * @param decorator the decorator entries
     * @param position if defined, where in the source code the expression is
     */
    constructor(
        readonly expressions: Expression[],
        decorator: Map<string, string | undefined>,
        position?: ASTExpressionPosition
    ) {
        super(decorator, "FunctionExpression", position);
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
        super(decorator, "NativeFunctionExpression", position);
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
     * @param target evaluated to provide the function to invoke
     * @param argumentExpressions evaluated to provide arguments
     * @param position if defined, where in the source code the expression is
     */
    constructor(
        readonly target: Expression,
        readonly argumentExpressions: InvocationArgument[],
        position?: ASTExpressionPosition
    ) {
        super("InvokationExpression", position);
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
    constructor(readonly field: string | number, readonly target: Expression, position?: ASTExpressionPosition) {
        super("FieldAccessExpression", position);
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
        super("IdentifierExpression", position);
    }
}

/**
 * Assignment Expression
 * Evaluates to the assigned value
 */
export class AssignmentExpression extends Expression {
    /**
     * Creates a new AssignmentExpression consisting of a value, a field, and an optional target on which the
     * identifier is accessed.
     *
     * @param field name of the assigned field
     * @param target evaluates to the object where the field is located on, if not present, the scope is used
     * @param value evaluates to the assigned value
     * @param position if defined, where in the source code the expression is
     */
    constructor(
        readonly field: string,
        readonly target: Expression | undefined,
        readonly value: Expression,
        position?: ASTExpressionPosition
    ) {
        super("AssignmentExpression", position);
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
