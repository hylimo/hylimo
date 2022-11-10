import { IToken } from "chevrotain";
import { InterpreterContext } from "../runtime/interpreter";
import { BaseObject, FieldEntry } from "../runtime/objects/baseObject";
import { FullObject } from "../runtime/objects/fullObject";
import { FunctionObject, NativeFunctionObject } from "../runtime/objects/function";
import { NumberObject } from "../runtime/objects/number";
import { StringObject } from "../runtime/objects/string";
import { SemanticFieldNames } from "../runtime/semanticFieldNames";

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
    abstract evaluate(context: InterpreterContext): FieldEntry;

    /**
     * Evaluates this expression, also provides the source of the result.
     * Uses evaluate, if no source is set, sets itelf as source.
     * Should be overwritten if other logic is required.
     *
     * @param context context in which this is performed
     * @returns the evaluation result
     */
    evaluateWithSource(context: InterpreterContext): FieldEntry {
        return this.ensureSource(this.evaluate(context));
    }

    /**
     * Helper function to create a FieldAccessExpression without a position
     * and this as the taget
     *
     * @param name the name of the field
     * @returns the created FieldAccessExpression
     */
    field(name: string | number): FieldAccessExpression {
        return new FieldAccessExpression(name, this);
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
        return new InvocationExpression(this, escapedArgs);
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
        return new SelfInvocationExpression(name, this, escapedArgs);
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

    /**
     * Ensures that fieldEntry has a source.
     * If source is not set, creates a new FieldEntry with the same value and this as source
     *
     * @param fieldEntry the field entry to check
     * @returns fieldEntry or the new FieldEntry with the same value
     */
    protected ensureSource(fieldEntry: FieldEntry): FieldEntry {
        if (fieldEntry.source) {
            return fieldEntry;
        } else {
            return {
                value: fieldEntry.value,
                source: this
            };
        }
    }
}

/**
 * Wrapper over an already existing expression, can be used to prevent re-evaluation
 */
export class ConstExpression extends Expression {
    /**
     * Creates a new ConstExpression with the specified value
     * @param value the value which is wrapped
     */
    constructor(readonly value: FieldEntry) {
        super("ConstExpression");
    }

    override evaluate(_context: InterpreterContext): FieldEntry {
        return this.value;
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

    override evaluate(context: InterpreterContext): FieldEntry {
        return { value: new StringObject(this.value, context.stringPrototype) };
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

    override evaluate(context: InterpreterContext): FieldEntry {
        return { value: new NumberObject(this.value, context.numberPrototype) };
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

    override evaluate(context: InterpreterContext): FieldEntry {
        return { value: new FunctionObject(this, context.currentScope, context.functionPrototype) };
    }
}

/**
 * Type for the callback of native functions
 */
export type NativeFunctionType = (args: InvocationArgument[], context: InterpreterContext) => FieldEntry;

/**
 * Native (JS) function expression
 * Never the result of the parser
 */
export class NativeFunctionExpression extends AbstractFunctionExpression {
    /**
     * Creates a new NativeFunctionExpression consiting of a set of decorator entires
     * and a callback which is executed to get the result of the function
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

    override evaluate(context: InterpreterContext): FieldEntry {
        return { value: new NativeFunctionObject(this, context.nativeFunctionPrototype) };
    }
}

/**
 * Base class for all invocation expressions, provides helper to generate args
 */
export abstract class AbstractInvocationExpression extends Expression {
    /**
     * Base constructor for all AbstractInvocationExpressions
     * @param position if defined, where in the source code the expression is
     * @param type used for serialization and debugging
     */
    constructor(readonly argumentExpressions: InvocationArgument[], type: string, position?: ASTExpressionPosition) {
        super(type, position);
    }
}

/**
 * Function invocation expression
 * Evaluates to the result of the called function
 */
export class InvocationExpression extends AbstractInvocationExpression {
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
        argumentExpressions: InvocationArgument[],
        position?: ASTExpressionPosition
    ) {
        super(argumentExpressions, "InvokationExpression", position);
    }

    override evaluate(context: InterpreterContext): FieldEntry {
        const targetValue = this.target.evaluate(context).value;
        return targetValue.invoke(this.argumentExpressions, context);
    }
}

/**
 * Function invocation which provides the self parameter automatically
 * Accesses the field name on target, invokes it and provides target as self
 */
export class SelfInvocationExpression extends AbstractInvocationExpression {
    /**
     * Creates a new InvocationExpression consisting of an expression of which the result should be invoked,
     * and a set of optionally named expressions as arguments
     *
     * @param target evaluated to provide the function to invoke
     * @param name the name or index to access on target
     * @param argumentExpressions evaluated to provide arguments
     * @param position if defined, where in the source code the expression is
     */
    constructor(
        readonly name: string | number,
        readonly target: Expression,
        argumentExpressions: InvocationArgument[],
        position?: ASTExpressionPosition
    ) {
        super(argumentExpressions, "InvokationExpression", position);
    }

    override evaluate(context: InterpreterContext): FieldEntry {
        const targetValue = this.target.evaluateWithSource(context);
        const fieldValue = targetValue.value.getField(this.name, context);
        return fieldValue.invoke(
            [...this.argumentExpressions, { value: new ConstExpression(targetValue), name: SemanticFieldNames.SELF }],
            context
        );
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

    override evaluate(context: InterpreterContext): FieldEntry {
        const targetValue = this.target.evaluate(context).value;
        return targetValue.getFieldEntry(this.name, context);
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

    override evaluate(context: InterpreterContext): FieldEntry {
        return context.currentScope.getFieldEntry(this.identifier, context);
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

    override evaluate(context: InterpreterContext): FieldEntry {
        let targetValue: BaseObject;
        if (this.target) {
            targetValue = this.target.evaluate(context).value;
        } else {
            targetValue = context.currentScope;
        }
        let valueValue = this.value.evaluateWithSource(context);
        if (this.target) {
            targetValue.setLocalField(this.name, valueValue, context);
        } else {
            targetValue.setFieldEntry(this.name, valueValue, context);
        }
        return valueValue;
    }
}

/**
 * Destructuring expression
 * Evaluates the right side, and assigns all names on the left side the value at their index
 */
export class DestructuringExpression extends Expression {
    /**
     * Creates a new DestructuringExpression consisting of a set of names to assign, and the value to destructure
     *
     * @param names the names of the field on the current context to assign
     * @param value the right hand side, provides the values
     * @param position if defined, where in the source code the expression is
     */
    constructor(readonly names: string[], readonly value: Expression, position?: ASTExpressionPosition) {
        super("DestructuringExpression", position);
    }

    override evaluate(context: InterpreterContext): FieldEntry {
        const valueValue = this.value.evaluate(context);
        for (let i = 0; i < this.names.length; i++) {
            context.currentScope.setFieldEntry(this.names[i], valueValue.value.getFieldEntry(i, context), context);
        }
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
