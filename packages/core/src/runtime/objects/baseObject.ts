import { ASTExpressionPosition, Expression } from "../../parser/ast";
import { InterpreterContext } from "../interpreter";
import { RuntimeError } from "../runtimeError";
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
     * @returns the value of the field
     */
    abstract getField(key: string | number, context: InterpreterContext): FieldEntry;

    /**
     * Sets the value of a field.
     * May throw an error if setting the field is not supported
     *
     * @param key the identifier of the field
     * @param value the new value of the field
     * @param context context in which this is performed
     */
    abstract setField(key: string | number, value: FieldEntry, context: InterpreterContext): void;

    /**
     * Invokes this obeject.
     * Only supported on some subclasses.
     * Throws an error by default, should be overwritten if call is supported
     *
     * @param args Table containing all parameters
     * @param context context in which this is performed
     */
    invoke(args: FullObject, context: InterpreterContext): BaseObject {
        throw new RuntimeError("Invoke not supported");
    }
}

/**
 * Object type which only has a proto field and delegates every other access to it
 */
export abstract class SimpleObject extends BaseObject {
    constructor(readonly proto: FullObject) {
        super();
    }

    override getField(key: string | number, context: InterpreterContext): FieldEntry {
        if (key === SemanticFieldNames.PROTO) {
            return {
                value: this.proto
            };
        } else {
            return this.proto.getField(key, context);
        }
    }

    override setField(key: string | number, value: FieldEntry, context: InterpreterContext): void {
        if (key === SemanticFieldNames.PROTO) {
            throw new RuntimeError("Cannot set field proto of a non-Table");
        } else {
            this.proto.setField(key, value, context);
        }
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

/**
 * Well known field names which (usually) have a semantic meaning
 */
export enum SemanticFieldNames {
    /**
     * Prototype, should always be a table
     */
    PROTO = "proto",
    /**
     * Current scope
     */
    THIS = "this"
}
