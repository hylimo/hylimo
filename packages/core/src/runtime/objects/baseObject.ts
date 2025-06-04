import type { AbstractInvocationExpression } from "../../ast/abstractInvocationExpression.js";
import type { OperatorExpression } from "../../ast/operatorExpression.js";
import type { ExecutableListEntry } from "../ast/executableListEntry.js";
import type { InterpreterContext } from "../interpreter/interpreterContext.js";
import { RuntimeError } from "../runtimeError.js";
import { SemanticFieldNames } from "../semanticFieldNames.js";
import type { FullObject } from "./fullObject.js";
import type { LabeledValue } from "./labeledValue.js";

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
     * @param self the object to get the field from
     * @returns the field entry
     */
    abstract getField(key: string | number, context: InterpreterContext, self?: BaseObject): LabeledValue;

    /**
     * Gets all field entries
     *
     * @param context context in which this is performed
     * @param self the object to get the fields from
     * @returns all field entries
     */
    abstract getFields(context: InterpreterContext, self?: BaseObject): Map<string | number, LabeledValue>;

    /**
     * Wrapper for getField which only returns the value
     *
     * @param key the identifier of the field
     * @param context context in which this is performed
     * @param self the object to get the field from
     * @returns the value of the field
     */
    getFieldValue(key: string | number, context: InterpreterContext, self?: BaseObject): BaseObject {
        return this.getField(key, context, self).value;
    }

    /**
     * Sets the value of a field.
     * May throw an error if setting the field is not supported
     *
     * @param key the identifier of the field
     * @param value the new field entry
     * @param context context in which this is performed
     * @param self the object to set the field on
     */
    abstract setField(key: string | number, value: LabeledValue, context: InterpreterContext, self?: BaseObject): void;

    /**
     * Sets a field locally
     *
     * @param key the identifier of the field
     * @param value the new value of the field
     * @param context context in which this is performed
     * @param self the object to set the field on
     */
    abstract setLocalField(
        key: string | number,
        value: LabeledValue,
        context: InterpreterContext,
        self?: BaseObject
    ): void;

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
        callExpression?: AbstractInvocationExpression | OperatorExpression
    ): LabeledValue;

    /**
     * Creates a readable string representation
     *
     * @param context context in which this is performed
     * @param maxDepth the maximum depth to query to avoid endless recursion
     * @returns a string representation
     */
    abstract toString(context: InterpreterContext, maxDepth: number): string;

    /**
     * Transforms this to a js number/string/object
     * Does not consider the prototype
     *
     * @returns the js representation
     */
    abstract toNative(): any;

    /**
     * Checks if this object is equal to another object
     *
     * @param other the other object
     * @returns true if they are equal
     */
    abstract equals(other: BaseObject): boolean;
}

/**
 * Object type which only has a proto field and delegates every other access to it
 */
export abstract class SimpleObject extends BaseObject {
    override get isNull(): boolean {
        return false;
    }

    /**
     * Provides the prototype of this object based on the context
     *
     * @param context the context providing the prototype
     * @returns the prototype of this object
     */
    abstract getProto(context: InterpreterContext): FullObject;

    override getField(key: string | number, context: InterpreterContext, self?: BaseObject): LabeledValue {
        if (key === SemanticFieldNames.PROTO) {
            return {
                value: this.getProto(context)
            };
        } else {
            return this.getProto(context).getField(key, context, self ?? this);
        }
    }

    override getFields(context: InterpreterContext, self?: BaseObject): Map<string | number, LabeledValue> {
        return this.getProto(context).getFields(context, self ?? this);
    }

    override setField(key: string | number, value: LabeledValue, context: InterpreterContext, self?: BaseObject): void {
        if (key === SemanticFieldNames.PROTO) {
            throw new RuntimeError("Cannot set field proto of a non-Object");
        } else {
            this.getProto(context).setField(key, value, context, self ?? this);
        }
    }

    override setLocalField(
        _key: string | number,
        _value: LabeledValue,
        _context: InterpreterContext,
        _self?: BaseObject
    ) {
        throw new RuntimeError("Cannot set field directly of a non-Object");
    }

    override deleteField(_key: string | number, _context: InterpreterContext): void {
        throw new RuntimeError("Cannot delete field of a non-Object");
    }

    override invoke(
        _args: ExecutableListEntry[],
        _context: InterpreterContext,
        _scope?: FullObject,
        _callExpression?: AbstractInvocationExpression | OperatorExpression
    ): LabeledValue {
        throw new RuntimeError("Invoke not supported");
    }
}
