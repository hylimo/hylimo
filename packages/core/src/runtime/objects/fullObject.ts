import { AbstractInvocationExpression } from "../../ast/abstractInvocationExpression";
import { ExecutableInvocationArgument } from "../ast/executableAbstractInvocationExpression";
import { InterpreterContext } from "../interpreter";
import { RuntimeError } from "../runtimeError";
import { SemanticFieldNames } from "../semanticFieldNames";
import { BaseObject, FieldEntry } from "./baseObject";

/**
 * Object with full support for both number (integer) and
 */
export class FullObject extends BaseObject {
    readonly fields: Map<string | number, FieldEntry> = new Map();

    /**
     * If generated, the native object
     */
    private nativeObject?: { [key: string]: any };

    override get isNull(): boolean {
        return false;
    }

    override getFieldEntry(key: string | number, context: InterpreterContext): FieldEntry {
        this.checkValidKey(key);
        return this.getFieldEntryInternal(key, context);
    }

    override getFieldEntries(): Record<string, FieldEntry> {
        const proto = this.getProto();
        const entries: Record<string, FieldEntry> = proto?.getFieldEntries() ?? {};
        for (const [key, value] of this.fields) {
            entries[key] = value;
        }
        return entries;
    }

    /**
     * Gets the value of a field without performing any checks.
     * If the field is not found on this, returns it from the proto field.
     * If it is not found on any parent, returns null from the provided context.
     * Does not validate the key.
     *
     * @param key the identifier of the field
     * @param context context in which this is performed
     * @returns the value of the field
     */
    private getFieldEntryInternal(key: string | number, context: InterpreterContext): FieldEntry {
        const value = this.fields.get(key);
        if (value) {
            return value;
        } else {
            const proto = this.getProto();
            return proto?.getFieldEntryInternal(key, context) ?? { value: context.null };
        }
    }

    /**
     * Checks if this object has a specific field
     *
     * @param key the field to check for
     * @returns true if this object (or any prototype) has the field
     */
    hasField(key: string | number): boolean {
        this.checkValidKey(key);
        if (this.fields.has(key)) {
            return true;
        } else {
            const proto = this.getProto();
            return proto?.hasField(key) ?? false;
        }
    }

    /**
     * Gets the value of a field without performing any checks.
     * If the field is not found on this, returns null from the provided context.
     *
     * @param key the identifier of the field
     * @param context context in which this is performed
     * @returns the value of the field
     */
    getLocalField(key: string | number, context: InterpreterContext): FieldEntry {
        const value = this.fields.get(key);
        if (value != undefined) {
            return value;
        } else {
            return { value: context.null };
        }
    }

    /**
     * Gets the value of a local field without performing any checks.
     * If the field is not found or contains null, returns undefined.
     *
     * @param key the identifier of the field
     * @returns the value of the field or undefined
     */
    getLocalFieldOrUndefined(key: string | number): FieldEntry | undefined {
        const field = this.fields.get(key);
        if (field == undefined || field.value.isNull) {
            return undefined;
        } else {
            return field;
        }
    }

    override setFieldEntry(key: string | number, value: FieldEntry, context: InterpreterContext): void {
        this.checkValidKey(key);
        if (!this.setExistingField(key, value, context)) {
            this.setLocalField(key, value);
        }
    }

    /**
     * Sets an already existing field
     *
     * @param key the identifier of the field
     * @param value the new value of the field
     * @param context context in which this is performed
     * @returns true if the field was found and its value set, otherwise false
     */
    private setExistingField(key: string | number, value: FieldEntry, context: InterpreterContext): boolean {
        if (this.fields.has(key)) {
            this.setLocalField(key, value);
            return true;
        } else {
            const proto = this.getProto();
            if (proto) {
                return proto.setExistingField(key, value, context);
            } else {
                return false;
            }
        }
    }

    override setLocalField(key: string | number, value: FieldEntry): void {
        const isProto = key === SemanticFieldNames.PROTO;
        if (isProto) {
            if (!value.value.isNull && !(value.value instanceof FullObject)) {
                throw new RuntimeError('"proto" must be set to an object or null');
            }
        }
        this.fields.set(key, value);
        if (isProto) {
            this.validateProto();
        }
    }

    override deleteField(key: string | number): void {
        this.checkValidKey(key);
        this.fields.delete(key);
    }

    /**
     * Validates that proto fields do not form a loop.
     * Should be called after an update to proto.
     * Throws an error if a loop is detected.
     */
    private validateProto(): void {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        let current: FullObject | undefined = this;
        while (current != undefined) {
            current = current.getProto();
            if (current === this) {
                throw new RuntimeError("Proto loop detected");
            }
        }
    }

    /**
     * Checks that key is a valid key
     * Throws an error if key if a number and not a positive integer
     *
     * @param key the string or number to check
     */
    private checkValidKey(key: string | number) {
        if (typeof key === "number" && !(Number.isInteger(key) || key >= 0)) {
            throw new RuntimeError("Only Integers >= 0 are supported as numerical keys");
        }
    }

    /**
     * Gets the proto field
     *
     * @returns the proto field or undefined if not defined
     */
    private getProto(): FullObject | undefined {
        return this.fields.get(SemanticFieldNames.PROTO)?.value as FullObject | undefined;
    }

    override toString(): string {
        let res = "{\n";
        for (const [name, value] of this.fields.entries()) {
            if (name != SemanticFieldNames.THIS && name != SemanticFieldNames.PROTO) {
                const escapedName = typeof name === "string" ? `"${name}"` : name.toString();
                res += `  ${escapedName}: ${value.value.toString().replaceAll("\n", "\n  ")}\n`;
            }
        }
        res += "}";
        return res;
    }

    override toNative(): any {
        if (this.nativeObject == undefined) {
            const newObject: { [key: string]: any } = {};
            this.nativeObject = newObject;
            this.fields.forEach((value, key) => {
                if (key !== SemanticFieldNames.PROTO) {
                    newObject[key] = value.value.toNative();
                }
            });
        }
        return this.nativeObject;
    }

    override invoke(
        _args: ExecutableInvocationArgument[],
        _context: InterpreterContext,
        _scope?: FullObject,
        _callExpression?: AbstractInvocationExpression
    ): FieldEntry {
        throw new RuntimeError("Invoke not supported");
    }
}
