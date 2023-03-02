import { InterpreterContext } from "../interpreter";
import { RuntimeError } from "../runtimeError";
import { BaseObject, FieldEntry } from "./baseObject";

/**
 * BaseObject supporting neither get or set field, or call.
 * There shouls only be one instance during the lifetime of an interpreter
 */
export class NullObject extends BaseObject {
    override getFieldEntry(key: string | number, _context: InterpreterContext): FieldEntry {
        throw new RuntimeError(`Getting fields on null not supported: try to get ${key}`);
    }

    override getFieldEntries(): Record<string, FieldEntry> {
        return {};
    }

    override setFieldEntry(key: string | number, _value: FieldEntry, _context: InterpreterContext): void {
        throw new RuntimeError(`Setting fields on null not supported: try to set ${key}`);
    }

    override setLocalField(key: string | number, _value: FieldEntry, _context: InterpreterContext): void {
        throw new RuntimeError(`Setting fields on null not supported: try to set ${key}`);
    }

    override toString(): string {
        return "null";
    }

    override toNative(): any {
        return null;
    }
}
