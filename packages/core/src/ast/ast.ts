import { ExpressionMetadata } from "./expressionMetadata";
import { InvocationArgument } from "./invocationArgument";
import { FieldEntry } from "../runtime/objects/baseObject";
import { Type } from "../types/base";
import { ExecutableInvocationArgument } from "../runtime/ast/executableAbstractInvocationExpression";
import { InterpreterContext } from "../runtime/interpreter";
import { FullObject } from "../runtime/objects/fullObject";
import { ASTExpressionPosition } from "./astExpressionPosition";

/**
 * Base interface for all expressions
 */
export abstract class Expression {
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
    constructor(readonly type: string, readonly metadata: ExpressionMetadata) {}

    /**
     * Helper function to create a FieldAccessExpression without a position
     * and this as the taget
     *
     * @param name the name of the field
     * @returns the created FieldAccessExpression
     */
    field(name: string | number): FieldAccessExpression {
        return new FieldAccessExpression(name, this, ExpressionMetadata.NO_EDIT);
    }

    /**
     * Helper function to create an InvocationExpression without a position
     * and this as the target
     *
     * @param args arguments passt to the function
     * @returns the created InvocationExpression
     */
    call(...args: (InvocationArgument | Expression)[]): InvocationExpression {
        const escapedArgs = args.map((arg) => {
            if (arg instanceof Expression) {
                return { value: arg };
            } else {
                return arg;
            }
        });
        return new InvocationExpression(this, escapedArgs, ExpressionMetadata.NO_EDIT);
    }

    /**
     * Helper function to create an InvocationExpression without a position
     * and a field on this as target
     *
     * @param name the name of the field to access and call
     * @param args arguments passt to the function
     * @returns the created InvocationExpression
     */
    callField(name: string, ...args: (InvocationArgument | Expression)[]): InvocationExpression {
        const escapedArgs = args.map((arg) => {
            if (arg instanceof Expression) {
                return { value: arg };
            } else {
                return arg;
            }
        });
        return new SelfInvocationExpression(name, this, escapedArgs, ExpressionMetadata.NO_EDIT);
    }

    /**
     * Helper function to create an AssignmentExpression which assigns
     * a field on this as the target
     *
     * @param field the name of the field
     * @param value the new value of the field
     * @returns the created AssignmentExpression
     */
    assignField(field: string, value: Expression): AssignmentExpression {
        return new AssignmentExpression(field, this, value, ExpressionMetadata.NO_EDIT);
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
     * @param metadata metadata for the expression
     * @param type used for serialization and debugging
     */
    constructor(readonly decorator: Map<string, string | undefined>, type: string, metadata: ExpressionMetadata) {
        super(type, metadata);
    }
}

/**
 * Base class for all invocation expressions, provides helper to generate args
 */
export abstract class AbstractInvocationExpression extends Expression {
    /**
     * Base constructor for all AbstractInvocationExpressions
     * @param metadata metadata for the expression
     * @param type used for serialization and debugging
     */
    constructor(readonly argumentExpressions: InvocationArgument[], type: string, metadata: ExpressionMetadata) {
        super(type, metadata);
    }
}

/**
 * Assignment Expression
 * Evaluates to the assigned value
 */
export class AssignmentExpression extends Expression {
    static readonly TYPE = "AssignmentExpression";
    /**
     * Creates a new AssignmentExpression consisting of a value, a field, and an optional target on which the
     * identifier is accessed.
     *
     * @param name name of the assigned field
     * @param target evaluates to the object where the field is located on, if not present, the scope is used
     * @param value evaluates to the assigned value
     * @param metadata metadata for the expression
     */
    constructor(
        readonly name: string,
        readonly target: Expression | undefined,
        readonly value: Expression,
        metadata: ExpressionMetadata
    ) {
        super(AssignmentExpression.TYPE, metadata);
    }
}

/**
 * Expression which evaluates and returns an inner expression
 */
export class BracketExpression extends Expression {
    static readonly TYPE = "BracketExpression";
    /**
     * Creates a new BracketExpression consisting of an inner expression
     *
     * @param expression the inner expression
     * @param metadata metadata for the expression
     */
    constructor(readonly expression: Expression, metadata: ExpressionMetadata) {
        super(BracketExpression.TYPE, metadata);
    }
}

/**
 * Wrapper over an already existing expression, can be used to prevent re-evaluation
 */
export class ConstExpression extends Expression {
    static readonly TYPE = "ConstExpression";
    /**
     * Creates a new ConstExpression with the specified value
     * @param value the value which is wrapped
     */
    constructor(readonly value: FieldEntry) {
        super(ConstExpression.TYPE, ExpressionMetadata.NO_EDIT);
    }
}

/**
 * Destructuring expression
 * Evaluates the right side, and assigns all names on the left side the value at their index
 */
export class DestructuringExpression extends Expression {
    static readonly TYPE = "DestructuringExpression";
    /**
     * Creates a new DestructuringExpression consisting of a set of names to assign, and the value to destructure
     *
     * @param names the names of the field on the current context to assign
     * @param value the right hand side, provides the values
     * @param metadata metadata for the expression
     */
    constructor(readonly names: string[], readonly value: Expression, metadata: ExpressionMetadata) {
        super(DestructuringExpression.TYPE, metadata);
    }
}

/**
 * Field access expression
 * Evalueates to the value of the field
 */
export class FieldAccessExpression extends Expression {
    static readonly TYPE = "FieldAccessExpression";
    /**
     * Creates a new IdentifierExpression consisting of a target and a field to access
     *
     * @param target evaluated to provide the target of the field access
     * @param name name or index of the field to access
     * @param metadata metadata for the expression
     */
    constructor(readonly name: string | number, readonly target: Expression, metadata: ExpressionMetadata) {
        super(FieldAccessExpression.TYPE, metadata);
    }
}

/**
 * Normal function expression
 */
export class FunctionExpression extends AbstractFunctionExpression {
    static readonly TYPE = "FunctionExpression";
    /**
     * Creates a new FunctionExpression consisting of a set of decorator entries and a block
     * which is executed.
     *
     * @param expressions the content of the function
     * @param decorator the decorator entries
     * @param metadata metadata for the expression
     * @param types argument types to check on invocation
     */
    constructor(
        readonly expressions: Expression[],
        decorator: Map<string, string | undefined>,
        metadata: ExpressionMetadata,
        readonly types?: Map<string | number, Type>
    ) {
        super(decorator, FunctionExpression.TYPE, metadata);
    }
}

/**
 * Identifier expression
 * Equivalent to a field access expression on the local scope
 */
export class IdentifierExpression extends Expression {
    static readonly TYPE = "IdentifierExpression";
    /**
     * Creates a new IdentifierExpression consisting of an identifier
     * @param identifier the name of the identifier
     * @param metadata metadata for the expression
     */
    constructor(readonly identifier: string, metadata: ExpressionMetadata) {
        super(IdentifierExpression.TYPE, metadata);
    }
}

/*
 * Function invocation expression
 * Evaluates to the result of the called function
 */
export class InvocationExpression extends AbstractInvocationExpression {
    static readonly TYPE = "InvocationExpression";
    /**
     * Creates a new InvocationExpression consisting of an expression of which the result should be invoked,
     * and a set of optionally named expressions as arguments
     *
     * @param target evaluated to provide the function to invoke
     * @param argumentExpressions evaluated to provide arguments
     * @param metadata metadata for the expression
     */
    constructor(readonly target: Expression, argumentExpressions: InvocationArgument[], metadata: ExpressionMetadata) {
        super(argumentExpressions, InvocationExpression.TYPE, metadata);
    }
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
     * @param metadata metadata for the expression
     * @param type used for serialization and debugging
     */
    constructor(readonly value: T, type: string, metadata: ExpressionMetadata) {
        super(type, metadata);
    }
}

/**
 * Type for the callback of native functions
 */
export type NativeFunctionType = (
    args: ExecutableInvocationArgument[],
    context: InterpreterContext,
    staticScope: FullObject,
    callExpression: AbstractInvocationExpression | undefined
) => FieldEntry;

/**
 * Native (JS) function expression
 * Never the result of the parser
 */
export class NativeFunctionExpression extends AbstractFunctionExpression {
    static readonly TYPE = "NativeFunctionExpression";
    /**
     * Creates a new NativeFunctionExpression consiting of a set of decorator entires
     * and a callback which is executed to get the result of the function
     *
     * @param callback executed to get the result of the function
     * @param decorator the decorator entries
     * @param metadata metadata for the expression
     */
    constructor(
        readonly callback: NativeFunctionType,
        decorator: Map<string, string | undefined>,
        metadata: ExpressionMetadata
    ) {
        super(decorator, NativeFunctionExpression.TYPE, metadata);
    }
}

/**
 * Number expression
 */
export class NumberLiteralExpression extends LiteralExpression<number> {
    static readonly TYPE = "NumberLiteralExpression";
    /**
     * Creates a new NumberLiteralExpression consisting out of a constant number
     *
     * @param value the constant literal
     * @param metadata metadata for the expression
     */
    constructor(value: number, metadata: ExpressionMetadata) {
        super(value, NumberLiteralExpression.TYPE, metadata);
    }
}

/**
 * Function invocation which provides the self parameter automatically
 * Accesses the field name on target, invokes it and provides target as self
 */
export class SelfInvocationExpression extends AbstractInvocationExpression {
    static readonly TYPE = "SelfInvocationExpression";
    /**
     * Creates a new InvocationExpression consisting of an expression of which the result should be invoked,
     * and a set of optionally named expressions as arguments
     *
     * @param target evaluated to provide the function to invoke
     * @param name the name or index to access on target
     * @param argumentExpressions evaluated to provide arguments
     * @param metadata metadata for the expression
     */
    constructor(
        readonly name: string | number,
        readonly target: Expression,
        argumentExpressions: InvocationArgument[],
        metadata: ExpressionMetadata
    ) {
        super(argumentExpressions, SelfInvocationExpression.TYPE, metadata);
    }
}

/**
 * String expression
 */
export class StringLiteralExpression extends LiteralExpression<string> {
    static readonly TYPE = "StringLiteralExpression";
    /**
     * Creates a new StringLiteralExpression consisting out of a constant string
     *
     * @param value the constant literal
     * @param metadata metadata for the expression
     */
    constructor(value: string, metadata: ExpressionMetadata) {
        super(value, StringLiteralExpression.TYPE, metadata);
    }
}
