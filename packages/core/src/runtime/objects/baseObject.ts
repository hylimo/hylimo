import { Expression, InvocationArgument } from "../../parser/ast";
import { InterpreterContext } from "../interpreter";
import { RuntimeError } from "../runtimeError";
import { SemanticFieldNames } from "../semanticFieldNames";
import { FullObject } from "./fullObject";

/**
 * Base class for all runtime objects
 */
export abstract class BaseObject {
    /**
     * Gets the value of a field
     *
     * @param key the identifier of the field
     * @param context context in which this is performed
     * @returns the field entry
     */
    abstract getFieldEntry(key: string | number, context: InterpreterContext): FieldEntry;

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
     * If the value contains the null value, the field is removed, otherwise the value is set
     *
     * @param key the identifier of the field
     * @param value the new value of the field
     * @param context context in which this is performed
     */
    abstract setLocalField(key: string | number, value: FieldEntry, context: InterpreterContext): void;

    /**
     * Invokes this obeject.
     * Only supported on some subclasses.
     * Throws an error by default, should be overwritten if call is supported
     *
     * @param args Arguments of the function, not yet evaluated
     * @param context context in which this is performed
     * @param scope if provided, the scope to use
     */
    invoke(_args: InvocationArgument[], _context: InterpreterContext, _scope?: FullObject): FieldEntry {
        throw new RuntimeError("Invoke not supported");
    }

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

    override setFieldEntry(key: string | number, value: FieldEntry, context: InterpreterContext): void {
        if (key === SemanticFieldNames.PROTO) {
            throw new RuntimeError("Cannot set field proto of a non-Object");
        } else {
            this.proto.setFieldEntry(key, value, context);
        }
    }

    override setLocalField(_key: string | number, _value: FieldEntry, _context: InterpreterContext) {
        throw new RuntimeError("Cannot set field directly of a non-Object");
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
