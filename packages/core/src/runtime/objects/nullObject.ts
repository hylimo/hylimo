import type { AbstractInvocationExpression } from "../../ast/abstractInvocationExpression.js";
import type { OperatorExpression } from "../../ast/operatorExpression.js";
import type { ExecutableListEntry } from "../ast/executableListEntry.js";
import type { InterpreterContext } from "../interpreter/interpreterContext.js";
import { RuntimeError } from "../runtimeError.js";
import { BaseObject } from "./baseObject.js";
import type { LabeledValue } from "./labeledValue.js";
import type { FullObject } from "./fullObject.js";

/**
 * BaseObject supporting neither get or set field, or call.
 * There should only be one instance during the lifetime of an interpreter
 */
export class NullObject extends BaseObject {
    override get isNull(): boolean {
        return true;
    }

    override getField(key: string | number, _context: InterpreterContext, _self: BaseObject): LabeledValue {
        throw new RuntimeError(`Cannot get '${key}' as the parent object is null`);
    }

    override getFields(_context: InterpreterContext, _self: BaseObject): Map<string | number, LabeledValue> {
        return new Map();
    }

    override setField(
        key: string | number,
        _value: LabeledValue,
        _context: InterpreterContext,
        _self: BaseObject
    ): void {
        throw new RuntimeError(`Cannot set '${key}' as the parent object is null`);
    }

    override setLocalField(
        key: string | number,
        _value: LabeledValue,
        _context: InterpreterContext,
        _self: BaseObject
    ): void {
        throw new RuntimeError(`Cannot set '${key}' as the parent object is null`);
    }

    override deleteField(key: string | number, _context: InterpreterContext): void {
        throw new RuntimeError(`Cannot delete '${key}' as the parent object is null`);
    }

    override invoke(
        _args: ExecutableListEntry[],
        _context: InterpreterContext,
        _scope?: FullObject,
        _callExpression?: AbstractInvocationExpression | OperatorExpression
    ): LabeledValue {
        throw new RuntimeError("cannot call method: method is null");
    }

    override toString(): string {
        return "null";
    }

    override toNative(): any {
        return null;
    }

    override equals(other: BaseObject): boolean {
        return other instanceof NullObject;
    }
}
