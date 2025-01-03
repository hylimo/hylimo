import { AbstractInvocationExpression } from "../../ast/abstractInvocationExpression.js";
import { OperatorExpression } from "../../ast/operatorExpression.js";
import { ExecutableListEntry } from "../ast/executableListEntry.js";
import { InterpreterContext } from "../interpreter/interpreterContext.js";
import { RuntimeError } from "../runtimeError.js";
import { SemanticFieldNames } from "../semanticFieldNames.js";
import { BaseObject } from "./baseObject.js";
import { LabeledValue } from "./labeledValue.js";
import { FullObject } from "./fullObject.js";

/**
 * Wrapper for a js object.
 *
 * @param T the type of the wrapped object
 */
export class WrapperObject<T> extends BaseObject {
    override get isNull(): boolean {
        return false;
    }

    /**
     * Creates a new WrapperObject
     *
     * @param wrapped the wrapped object
     * @param proto the prototype of the wrapped object
     * @param entries entries function which compute the value of the fields
     */
    constructor(
        readonly wrapped: T,
        readonly proto: FullObject,
        readonly entries: Map<string | number, WrapperObjectFieldRetriever<T>>
    ) {
        super();
    }

    override getField(key: string | number, context: InterpreterContext, self?: BaseObject): LabeledValue {
        if (key === SemanticFieldNames.PROTO) {
            return { value: this.proto };
        }
        const value = this.entries.get(key);
        if (value != undefined) {
            return { value: value(this.wrapped, context) };
        }
        return this.proto.getField(key, context, self ?? this);
    }

    override getFields(context: InterpreterContext, self?: BaseObject): Map<string | number, LabeledValue> {
        const entries = this.proto.getFields(context, self ?? this);
        for (const [key, value] of this.entries) {
            entries.set(key, { value: value(this.wrapped, context) });
        }
        return entries;
    }

    override setField(key: string | number, value: LabeledValue, context: InterpreterContext, self?: BaseObject): void {
        if (key === SemanticFieldNames.PROTO) {
            throw new RuntimeError("Cannot set field proto of a wrapped Object");
        } else {
            this.proto.setField(key, value, context, self ?? this);
        }
    }

    override setLocalField(
        _key: string | number,
        _value: LabeledValue,
        _context: InterpreterContext,
        _self?: BaseObject
    ): void {
        throw new RuntimeError("Cannot set field directly of a wrapped Object");
    }

    override deleteField(_key: string | number, _context: InterpreterContext): void {
        throw new RuntimeError("Cannot delete field of a wrapped Object");
    }

    override invoke(
        _args: ExecutableListEntry[],
        _context: InterpreterContext,
        _scope?: FullObject,
        _callExpression?: AbstractInvocationExpression | OperatorExpression
    ): LabeledValue {
        throw new RuntimeError("Invoke not supported");
    }

    override toString(context: InterpreterContext, maxDepth: number = 3): string {
        let res = "{\n";
        for (const [name, value] of this.entries.entries()) {
            if (name != SemanticFieldNames.THIS && name != SemanticFieldNames.PROTO) {
                const escapedName = typeof name === "string" ? `"${name}"` : name.toString();
                if (maxDepth > 0)
                    res += `  ${escapedName}: ${value(this.wrapped, context)
                        .toString(context, maxDepth - 1)
                        .replaceAll("\n", "\n  ")}\n`;
                else res += `  ${escapedName}: <more data>`;
            }
        }
        res += "}";
        return res;
    }

    override toNative(): T {
        return this.wrapped;
    }

    override equals(other: BaseObject): boolean {
        return other instanceof WrapperObject && this.wrapped === other.wrapped;
    }
}

/**
 * Function to retrieve a field of a wrapped object
 *
 * @param T the type of the wrapped object
 * @param wrapped the wrapped object
 * @param context the interpreter context
 */
export type WrapperObjectFieldRetriever<T> = (wrapped: T, context: InterpreterContext) => BaseObject;
