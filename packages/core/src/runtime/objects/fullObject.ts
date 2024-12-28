import { AbstractInvocationExpression } from "../../ast/abstractInvocationExpression.js";
import { OperatorExpression } from "../../ast/operatorExpression.js";
import { ExecutableListEntry } from "../ast/executableListEntry.js";
import { InterpreterContext } from "../interpreter/interpreterContext.js";
import { RuntimeError } from "../runtimeError.js";
import { SemanticFieldNames } from "../semanticFieldNames.js";
import { BaseObject } from "./baseObject.js";
import { LabeledValue } from "./labeledValue.js";
import { AbstractFunctionObject } from "./functionObject.js";
import { Property } from "./property.js";

/**
 * Object with full support for both number (integer) and
 */
export class FullObject extends BaseObject {
    readonly fields: Map<string | number, LabeledValue> = new Map();
    properties?: Map<string | number, Property>;

    /**
     * If generated, the native object
     */
    private nativeObject?: { [key: string]: any };

    /**
     * The prototype of this object
     * Must also be contained in the fields
     */
    private proto?: FullObject;

    override get isNull(): boolean {
        return false;
    }

    override getField(key: string | number, context: InterpreterContext, self?: BaseObject): LabeledValue {
        this.checkValidKey(key);
        return this.getFieldInternal(key, context, self ?? this);
    }

    override getFields(context: InterpreterContext, self?: BaseObject): Map<string | number, LabeledValue> {
        const proto = this.proto;
        const entries: Map<string | number, LabeledValue> = proto?.getFields(context, self ?? this) ?? new Map();
        for (const [key, value] of this.fields) {
            entries.set(key, value);
        }
        if (this.properties == undefined) {
            return entries;
        }
        for (const [key, value] of this.properties) {
            entries.set(key, value.get(self ?? this, context));
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
     * @param self the object to get the field from
     * @returns the value of the field
     */
    private getFieldInternal(key: string | number, context: InterpreterContext, self: BaseObject): LabeledValue {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        let target: FullObject | undefined = this;
        do {
            const property = target.properties?.get(key);
            if (property !== undefined) {
                return property.get(self, context);
            }
            const value = target.fields.get(key);
            if (value !== undefined) {
                return value;
            }
            target = target.proto;
        } while (target !== undefined);
        return this.getDefaultValue(key, context);
    }

    /**
     * Gets the default value for a field
     * By default, null with no source is returned
     *
     * @param key the key of the field
     * @param context the context in which this is performed
     * @returns the default value
     */
    protected getDefaultValue(key: string | number, context: InterpreterContext): LabeledValue {
        return { value: context.null };
    }

    /**
     * Checks if this object has a specific field
     *
     * @param key the field to check for
     * @returns true if this object (or any prototype) has the field
     */
    hasField(key: string | number): boolean {
        this.checkValidKey(key);
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        let target: FullObject | undefined = this;
        do {
            if (target.fields.has(key) || target.properties?.has(key)) {
                return true;
            }
            target = target.proto;
        } while (target !== undefined);
        return false;
    }

    /**
     * Gets the value of a field without performing any checks.
     * If the field is not found on this, returns null from the provided context.
     *
     * @param key the identifier of the field
     * @param context context in which this is performed
     * @param self the object to get the field from
     * @returns the value of the field
     */
    getLocalField(key: string | number, context: InterpreterContext, self?: BaseObject): LabeledValue {
        const property = this.getProperty(key);
        if (property !== undefined) {
            return property.get(self ?? this, context);
        }
        const value = this.fields.get(key);
        if (value !== undefined) {
            return value;
        }
        return this.getDefaultValue(key, context);
    }

    /**
     * Gets the value of a local field without performing any checks.
     * If the field is not found or contains null, returns undefined.
     * Does NOT support properties.
     *
     * @param key the identifier of the field
     * @returns the value of the field or undefined
     */
    getLocalFieldOrUndefined(key: string | number): LabeledValue | undefined {
        const field = this.fields.get(key);
        if (field === undefined || field.value.isNull) {
            return undefined;
        } else {
            return field;
        }
    }

    override setField(key: string | number, value: LabeledValue, context: InterpreterContext, self?: BaseObject): void {
        this.checkValidKey(key);
        if (!this.setExistingField(key, value, context, self ?? this)) {
            this.setLocalField(key, value, context, self);
        }
    }

    /**
     * Sets an already existing field
     *
     * @param key the identifier of the field
     * @param value the new value of the field
     * @param context context in which this is performed
     * @param self the object to set the field on
     * @returns true if the field was found and its value set, otherwise false
     */
    private setExistingField(
        key: string | number,
        value: LabeledValue,
        context: InterpreterContext,
        self: BaseObject
    ): boolean {
        if (this.fields.has(key) || this.properties?.has(key)) {
            this.setLocalField(key, value, context, self);
            return true;
        } else {
            const proto = this.proto;
            if (proto) {
                return proto.setExistingField(key, value, context, self);
            } else {
                return false;
            }
        }
    }

    override setLocalField(
        key: string | number,
        value: LabeledValue,
        context: InterpreterContext,
        self?: BaseObject
    ): void {
        const isProto = key === SemanticFieldNames.PROTO;
        if (isProto) {
            if (!value.value.isNull && !(value.value instanceof FullObject)) {
                throw new RuntimeError('"proto" must be set to an object or null');
            }
            this.proto = value.value as FullObject;
            this.fields.set(key, value);
            this.validateProto();
        } else {
            const property = this.getProperty(key);
            if (property !== undefined) {
                property.set(self ?? this, value, context);
            } else {
                this.fields.set(key, value);
            }
        }
    }

    /**
     * Gets a property, respecting the proto field
     *
     * @param key the key of the property
     * @returns the property or undefined if not found
     */
    private getProperty(key: string | number): Property | undefined {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        let target: FullObject | undefined = this;
        do {
            const property = target.properties?.get(key);
            if (property !== undefined) {
                return property;
            }
            target = target.proto;
        } while (target !== undefined);
        return undefined;
    }

    override deleteField(key: string | number): void {
        this.checkValidKey(key);
        this.fields.delete(key);
        this.properties?.delete(key);
    }

    /**
     * Defines a property on this object
     *
     * @param key the key of the property
     * @param getter the getter
     * @param setter the setter
     */
    defineProperty(
        key: string | number,
        getter: AbstractFunctionObject<any>,
        setter: AbstractFunctionObject<any>
    ): void {
        this.checkValidKey(key);
        if (key === SemanticFieldNames.PROTO) {
            throw new RuntimeError("Cannot define property 'proto'");
        }
        this.deleteField(key);
        if (this.properties == undefined) {
            this.properties = new Map();
        }
        this.properties.set(key, new Property(getter, setter));
    }

    /**
     * Validates that proto fields do not form a loop.
     * Should be called after an update to proto.
     * Throws an error if a loop is detected.
     */
    private validateProto(): void {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        let current: FullObject | undefined = this;
        while (current !== undefined) {
            current = current.proto;
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
        if (typeof key === "number" && (!Number.isInteger(key) || key < 0)) {
            throw new RuntimeError("Only Integers >= 0 are supported as numerical keys");
        }
    }

    override toString(context: InterpreterContext, maxDepth: number = 3): string {
        let res = "{\n";
        for (const [name, value] of this.fields.entries()) {
            if (name != SemanticFieldNames.THIS && name != SemanticFieldNames.PROTO) {
                const escapedName = typeof name === "string" ? `"${name}"` : name.toString();
                if (maxDepth > 0)
                    res += `  ${escapedName}: ${value.value
                        .toString(context, maxDepth - 1)
                        .replaceAll("\n", "\n  ")}\n`;
                else res += `  ${escapedName}: <more data>`;
            }
        }
        res += "}";
        return res;
    }

    override toNative(): any {
        if (this.nativeObject === undefined) {
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
        _args: ExecutableListEntry[],
        _context: InterpreterContext,
        _scope?: FullObject,
        _callExpression?: AbstractInvocationExpression | OperatorExpression
    ): LabeledValue {
        throw new RuntimeError("Invoke not supported");
    }

    override equals(other: BaseObject): boolean {
        return other === this;
    }
}
