import { Expression } from "../../ast/expression";
import { InterpreterContext } from "../interpreter";
import { FieldEntry } from "../objects/baseObject";
import {
    ExecutableAssignmentExpression,
    ExecutableFieldAccessExpression,
    ExecutableListEntry,
    ExecutableInvocationExpression,
    ExecutableSelfInvocationExpression
} from "../..";

/**
 * Base class for all executable expressions.
 *
 * @param T the type of expression this represents
 */
export abstract class ExecutableExpression<T extends Expression = Expression> {
    /**
     * Base constructor for all Expressions
     * @param metadata metadata for the expression
     * @param type used for serialization and debugging
     */
    constructor(readonly expression: T | undefined) {}

    /**
     * Evaluates this expression by calling evaluateInternal
     * Also does error handling
     *
     * @param context context in which this is performed
     * @returns the evaluation result
     */
    evaluate(context: InterpreterContext): FieldEntry {
        try {
            return this.evaluateInternal(context);
        } catch (e: any) {
            if (Array.isArray(e.interpretationStack)) {
                e.interpretationStack.push(this.expression);
            }
            throw e;
        }
    }

    /**
     * Evaluates this expression
     * Must be overwritten to impplement the logic
     *
     * @param context context in which this is performed
     * @returns the evaluation result
     */
    abstract evaluateInternal(context: InterpreterContext): FieldEntry;

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
                source: this.expression
            };
        }
    }

    /**
     * Helper function to create a FieldAccessExpression without a position
     * and this as the taget
     *
     * @param name the name of the field
     * @returns the created FieldAccessExpression
     */
    field(name: string | number): ExecutableFieldAccessExpression {
        return new ExecutableFieldAccessExpression(undefined, this, name);
    }

    /**
     * Helper function to create an InvocationExpression without a position
     * and this as the target
     *
     * @param args arguments passt to the function
     * @returns the created InvocationExpression
     */
    call(...args: (ExecutableListEntry | ExecutableExpression)[]): ExecutableInvocationExpression {
        const escapedArgs = args.map((arg) => {
            if (arg instanceof ExecutableExpression) {
                return { value: arg };
            } else {
                return arg;
            }
        });
        return new ExecutableInvocationExpression(undefined, escapedArgs, this);
    }

    /**
     * Helper function to create an InvocationExpression without a position
     * and a field on this as target
     *
     * @param name the name of the field to access and call
     * @param args arguments passt to the function
     * @returns the created InvocationExpression
     */
    callField(
        name: string,
        ...args: (ExecutableListEntry | ExecutableExpression)[]
    ): ExecutableSelfInvocationExpression {
        const escapedArgs = args.map((arg) => {
            if (arg instanceof ExecutableExpression) {
                return { value: arg };
            } else {
                return arg;
            }
        });
        return new ExecutableSelfInvocationExpression(undefined, escapedArgs, this, name);
    }

    /**
     * Helper function to create an AssignmentExpression which assigns
     * a field on this as the target
     *
     * @param field the name of the field
     * @param value the new value of the field
     * @returns the created AssignmentExpression
     */
    assignField(field: string, value: ExecutableExpression): ExecutableAssignmentExpression {
        return new ExecutableAssignmentExpression(undefined, this, value, field);
    }
}
