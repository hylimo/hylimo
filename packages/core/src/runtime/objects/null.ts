import { InterpreterContext } from "../interpreter";
import { RuntimeError } from "../runtimeError";
import { BaseObject, FieldEntry } from "./baseObject";

/**
 * BaseObject supporting neither get or set field, or call.
 * There shouls only be one instance during the lifetime of an interpreter
 */
export class NullObject extends BaseObject {
    override getField(key: string | number, context: InterpreterContext): FieldEntry {
        throw new RuntimeError("Getting fields on null not supported");
    }

    override setField(key: string | number, value: FieldEntry, context: InterpreterContext): void {
        throw new RuntimeError("Setting fields on null not supported");
    }

    override toString(): string {
        return "null";
    }
}
