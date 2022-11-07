import { IToken } from "chevrotain";
import { InterpreterContext } from "../runtime/interpreter";
import { BaseObject, FieldEntry } from "../runtime/objects/baseObject";
import { FullObject } from "../runtime/objects/fullObject";
import { Function, NativeFunction } from "../runtime/objects/function";
import { Number } from "../runtime/objects/number";
import { String } from "../runtime/objects/string";

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
 * Base class for all AST elements.
 * Subclasses must be treated as immutable.
 */
export abstract class Expression {
    /**
     * Base constructor for all Expressions
     * @param position if defined, where in the source code the expression is
     * @param type used for serialization and debugging
     */
    constructor(readonly type: string, readonly position?: ASTExpressionPosition) {}

    /**
     * Evaluates this expression
     *
     * @param context context in which this is performed
     */
    abstract evaluate(context: InterpreterContext): BaseObject;

    /**
     * Evaluates this expression, also provides the source of the result.
     * This default implementation returns itself as the source.
     * Should be overwritten if other semantics are wanted (e.g. for field access).
     *
     * @param context context in which this is performed
     * @returns the evaluation result
     */
    evaluateWithSource(context: InterpreterContext): FieldEntry {
        return {
            value: this.evaluate(context),
            source: this
        };
    }

    /**
     * Helper function to create a FieldAccessExpression without a position
     * and this as the taget
     *
     * @param name the name of the field
     * @returns the created FieldAccessExpression
     */
    field(name: string): FieldAccessExpression {
        return new FieldAccessExpression(name, this);
    }

    /**
     * Helper function to create an InvocationExpression without a position
     * and this as the target
     *
     * @param args arguments passt to the function
     * @returns the created InvocationExpression
     */
    call(args: InvocationArgument[]): InvocationExpression {
        return new InvocationExpression(this, args);
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
        return new AssignmentExpression(field, this, value);
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

    override evaluate(context: InterpreterContext): BaseObject {
        return new String(this.value, context.stringPrototype);
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

    override evaluate(context: InterpreterContext): BaseObject {
        return new Number(this.value, context.numberPrototype);
    }
}

/**
 * Expression evaluating to a constant natively defined literal
 *
 * @param T the type of the literal
 */
export class ConstLiteralExpression<T extends BaseObject> extends LiteralExpression<T> {
    /**
     * Creates a new ConstLiteralExpression consisting out of a constant T
     *
     * @param value the constant literal
     * @param position if defined, where in the source code the expression is
     */
    constructor(value: T, position?: ASTExpressionPosition) {
        super(value, "ConstLiteralExpression", position);
    }

    override evaluate(context: InterpreterContext): BaseObject {
        return this.value;
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

    override evaluate(context: InterpreterContext): BaseObject {
        return new Function(this, context.currentScope, context.functionPrototype);
    }
}

export type NativeFunctionType = (args: FullObject, context: InterpreterContext) => BaseObject;

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
    constructor(
        readonly callback: NativeFunctionType,
        decorator: Map<string, string | undefined>,
        position?: ASTExpressionPosition
    ) {
        super(decorator, "NativeFunctionExpression", position);
    }

    override evaluate(context: InterpreterContext): BaseObject {
        return new NativeFunction(this, context.nativeFunctionPrototype);
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

    override evaluate(context: InterpreterContext): BaseObject {
        const targetValue = this.target.evaluate(context);
        const args = FullObject.create(context);
        let indexCounter = 0;
        for (const argumentExpression of this.argumentExpressions) {
            const value = argumentExpression.value.evaluateWithSource(context);
            args.setField(argumentExpression.name ?? indexCounter++, value, context);
        }
        return targetValue.invoke(args, context);
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
     * @param name name or index of the field to access
     * @param position if defined, where in the source code the expression is
     */
    constructor(readonly name: string | number, readonly target: Expression, position?: ASTExpressionPosition) {
        super("FieldAccessExpression", position);
    }

    override evaluate(context: InterpreterContext): BaseObject {
        return this.evaluateWithSource(context).value;
    }

    override evaluateWithSource(context: InterpreterContext): FieldEntry {
        const targetValue = this.target.evaluate(context);
        return targetValue.getField(this.name, context);
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

    override evaluate(context: InterpreterContext): BaseObject {
        return this.evaluateWithSource(context).value;
    }

    override evaluateWithSource(context: InterpreterContext): FieldEntry {
        return context.currentScope.getField(this.identifier, context);
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
     * @param name name of the assigned field
     * @param target evaluates to the object where the field is located on, if not present, the scope is used
     * @param value evaluates to the assigned value
     * @param position if defined, where in the source code the expression is
     */
    constructor(
        readonly name: string,
        readonly target: Expression | undefined,
        readonly value: Expression,
        position?: ASTExpressionPosition
    ) {
        super("AssignmentExpression", position);
    }

    override evaluate(context: InterpreterContext): BaseObject {
        return this.evaluateWithSource(context).value;
    }

    override evaluateWithSource(context: InterpreterContext): FieldEntry {
        let targetValue: BaseObject;
        if (this.target) {
            targetValue = this.target.evaluate(context);
        } else {
            targetValue = context.currentScope;
        }
        let valueValue = this.value.evaluateWithSource(context);
        if (!valueValue.source) {
            valueValue = {
                value: valueValue.value,
                source: this
            };
        }
        targetValue.setField(this.name, valueValue, context);
        return valueValue;
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
