import { AbstractInvocationExpression } from "../../ast/abstractInvocationExpression.js";
import { ExecutableListEntry } from "../ast/executableListEntry.js";
import { InterpreterContext } from "../interpreter/interpreterContext.js";
import { RuntimeError } from "../runtimeError.js";
import { BaseObject, FieldEntry } from "./baseObject.js";
import { FullObject } from "./fullObject.js";

/**
 * BaseObject supporting neither get or set field, or call.
 * There shouls only be one instance during the lifetime of an interpreter
 */
export class NullObject extends BaseObject {
    override get isNull(): boolean {
        return true;
    }

    override getFieldEntry(key: string | number, _context: InterpreterContext, _self: BaseObject): FieldEntry {
        throw new RuntimeError(`Getting fields on null not supported: try to get ${key}`);
    }

    override getFieldEntries(_context: InterpreterContext, _self: BaseObject): Record<string, FieldEntry> {
        return {};
    }

    override setFieldEntry(
        key: string | number,
        _value: FieldEntry,
        _context: InterpreterContext,
        _self: BaseObject
    ): void {
        throw new RuntimeError(`Setting fields on null not supported: try to set ${key}`);
    }

    override setLocalField(
        key: string | number,
        _value: FieldEntry,
        _context: InterpreterContext,
        _self: BaseObject
    ): void {
        throw new RuntimeError(`Setting fields on null not supported: try to set ${key}`);
    }

    override deleteField(key: string | number, _context: InterpreterContext): void {
        throw new RuntimeError(`Deleting fields on null not supported: try to delete ${key}`);
    }

    override invoke(
        _args: ExecutableListEntry[],
        _context: InterpreterContext,
        _scope?: FullObject,
        _callExpression?: AbstractInvocationExpression
    ): FieldEntry {
        throw new RuntimeError("Invoking null is not supported");
    }

    override toString(): string {
        return "null";
    }

    override toNative(): any {
        return null;
    }
}
