import { AbstractFunctionObject } from "../runtime/objects/function";
import { NumberObject } from "../runtime/objects/number";
import { StringObject } from "../runtime/objects/string";
import { RuntimeError } from "../runtime/runtimeError";

/**
 * Helper to check that an object is a StringObject, throws an error if not
 *
 * @param value the value to check
 * @param description the description of the value, part of the error message
 * @returns the value of the StringObject
 */
export function assertString(value: any, description: string): string {
    if (!(value instanceof StringObject)) {
        throw new RuntimeError(`${description} is not a string`);
    }
    return value.value;
}

/**
 * Helper to check that an object is a NumberObject, throws an error if not
 *
 * @param value the value to check
 * @param description the description of the value, part of the error message
 * @returns the value of the NumberObject
 */
export function assertNumber(value: any, description: string): number {
    if (!(value instanceof NumberObject)) {
        throw new RuntimeError(`${description} is not a number`);
    }
    return value.value;
}

/**
 * Helper to check that an object is a AbstractFunctionObject, throws an error if not
 *
 * @param value the value to check
 * @param description the description of the value, part of the error message
 */
export function assertFunction(value: any, description: string): asserts value is AbstractFunctionObject {
    if (!(value instanceof AbstractFunctionObject)) {
        throw new RuntimeError(`${description} is not a function`);
    }
}
