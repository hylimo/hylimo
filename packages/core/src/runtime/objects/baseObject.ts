import { AbstractInvocationExpression } from "../../ast/abstractInvocationExpression";
import { Expression } from "../../ast/expression";
import { ExecutableListEntry } from "../ast/executableListEntry";
import { InterpreterContext } from "../interpreter";
import { RuntimeError } from "../runtimeError";
import { SemanticFieldNames } from "../semanticFieldNames";
import { FullObject } from "./fullObject";

/**
 * Base class for all runtime objects
 */
export abstract class BaseObject {
    /**
     * Wether this represents null or not
     */
    abstract readonly isNull: boolean;

    /**
     * Gets the value of a field
     *
     * @param key the identifier of the field
     * @param context context in which this is performed
     * @returns the field entry
     */
    abstract getFieldEntry(key: string | number, context: InterpreterContext): FieldEntry;

    /**
     * Gets all field entries
     *
     * @returns all field entries
     */
    abstract getFieldEntries(): Record<string, FieldEntry>;

    /**
     * Wrapper for getFieldEntry which only returns the value
     *
     * @param key the identifier of the field
     * @param context context in which this is performed
     * @returns the value of the field
     */
    getField(key: string | number, context: InterpreterContext): BaseObject {
        return this.getFieldEntry(key, context).value;
    }

    /**
     * Sets the value of a field.
     * May throw an error if setting the field is not supported
     *
     * @param key the identifier of the field
     * @param value the new field entry
     * @param context context in which this is performed
     */
    abstract setFieldEntry(key: string | number, value: FieldEntry, context: InterpreterContext): void;

    /**
     * Sets a field locally
     *
     * @param key the identifier of the field
     * @param value the new value of the field
     */
    abstract setLocalField(key: string | number, value: FieldEntry): void;

    /**
     * Deletes a field.
     * This is different from simply setting the field to null, as it removes the field from the object.
     *
     * @param key the identifier of the field
     * @param context context in which this is performed
     */
    abstract deleteField(key: string | number, context: InterpreterContext): void;

    /**
     * Invokes this obeject.
     * Only supported on some subclasses.
     * Throws an error by default, should be overwritten if call is supported
     *
     * @param args Arguments of the function, not yet evaluated
     * @param context context in which this is performed
     * @param scope if provided, the scope to use
     * @param callExpression the expression which causes the call and returns the results
     */
    abstract invoke(
        args: ExecutableListEntry[],
        context: InterpreterContext,
        scope?: FullObject,
        callExpression?: AbstractInvocationExpression
    ): FieldEntry;

    /**
     * Creates a readable string representation
     *
     * @returns a string representation
     */
    abstract toString(): string;

    /**
     * Transforms this to a js number/string/object
     * Does not consider the prototype
     *
     * @returns the js representation
     */
    abstract toNative(): any;
}

/**
 * Object type which only has a proto field and delegates every other access to it
 */
export abstract class SimpleObject extends BaseObject {
    override get isNull(): boolean {
        return false;
    }

    constructor(readonly proto: FullObject) {
        super();
    }

    override getFieldEntry(key: string | number, context: InterpreterContext): FieldEntry {
        if (key === SemanticFieldNames.PROTO) {
            return {
                value: this.proto
            };
        } else {
            return this.proto.getFieldEntry(key, context);
        }
    }

    override getFieldEntries(): Record<string, FieldEntry> {
        return this.proto.getFieldEntries();
    }

    override setFieldEntry(key: string | number, value: FieldEntry, context: InterpreterContext): void {
        if (key === SemanticFieldNames.PROTO) {
            throw new RuntimeError("Cannot set field proto of a non-Object");
        } else {
            this.proto.setFieldEntry(key, value, context);
        }
    }

    override setLocalField(_key: string | number, _value: FieldEntry) {
        throw new RuntimeError("Cannot set field directly of a non-Object");
    }

    override deleteField(_key: string | number, _context: InterpreterContext): void {
        throw new RuntimeError("Cannot delete field of a non-Object");
    }

    override invoke(
        _args: ExecutableListEntry[],
        _context: InterpreterContext,
        _scope?: FullObject,
        _callExpression?: AbstractInvocationExpression
    ): FieldEntry {
        throw new RuntimeError("Invoke not supported");
    }
}

/**
 * Entry of a field
 */
export interface FieldEntry {
    /**
     * The value of the field
     */
    value: BaseObject;
    /**
     *
     */
    source?: Expression;
}
