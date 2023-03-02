import { Expression } from "../../ast/ast";
import { InterpreterContext } from "../interpreter";
import { FieldEntry } from "../objects/baseObject";

/**
 * Base class for all executable expressions.
 *
 * @param T the type of expression this represents
 */
export abstract class ExecutableExpression<T extends Expression> {
    /**
     * Base constructor for all Expressions
     * @param metadata metadata for the expression
     * @param type used for serialization and debugging
     */
    constructor(readonly expression: T) {}

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
}
