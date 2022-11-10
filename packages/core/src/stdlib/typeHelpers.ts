import { Expression, InvocationArgument } from "../parser/ast";
import { BaseObject } from "../runtime/objects/baseObject";
import { FullObject } from "../runtime/objects/fullObject";
import { AbstractFunctionObject } from "../runtime/objects/function";
import { NumberObject } from "../runtime/objects/number";
import { StringObject } from "../runtime/objects/string";
import { RuntimeError } from "../runtime/runtimeError";
import { SemanticFieldNames } from "../runtime/semanticFieldNames";

/**
 * Helper to check that an object is a StringObject, throws an error if not
 *
 * @param value the value to check
 * @param description the description of the value, part of the error message
 * @returns the value of the StringObject
 */
export function assertString(value: BaseObject, description: string): string {
    if (!(value instanceof StringObject)) {
        throw new RuntimeError(`${description} is not a string`);
    }
    return value.value;
}

/**
 * Checks if a value is a StringObjectring
 *
 * @param value the value to check
 * @returns true iff it is a StringObject
 */
export function isString(value: BaseObject): boolean {
    return value instanceof StringObject;
}

/**
 * Helper to check that an object is a NumberObject, throws an error if not
 *
 * @param value the value to check
 * @param description the description of the value, part of the error message
 * @returns the value of the NumberObject
 */
export function assertNumber(value: BaseObject, description: string): number {
    if (!(value instanceof NumberObject)) {
        throw new RuntimeError(`${description} is not a number`);
    }
    return value.value;
}

/**
 * Checks if a value is a NumberObject
 *
 * @param value the value to check
 * @returns true iff it is a NumberObject
 */
export function isNumber(value: BaseObject): boolean {
    return value instanceof NumberObject;
}

/**
 * Helper to check that an object is a AbstractFunctionObject, throws an error if not
 *
 * @param value the value to check
 * @param description the description of the value, part of the error message
 */
export function assertFunction(value: BaseObject, description: string): asserts value is AbstractFunctionObject {
    if (!(value instanceof AbstractFunctionObject)) {
        throw new RuntimeError(`${description} is not a function`);
    }
}

/**
 * Helper to check that an object is a FullObject, throws an error if not
 *
 * @param value the value to check
 * @param description the description of the value, part of the error message
 */
export function assertObject(value: BaseObject, description: string): asserts value is FullObject {
    if (!(value instanceof FullObject)) {
        throw new RuntimeError(`${description} is not an object`);
    }
}

/**
 * Ensures that exactly two arguments are provided, one positional and one with name "self".
 * Throws an error otherwise
 *
 * @param args the arguments to evaluate
 * @param description the name of the function
 * @returns the expressions of first (self) and second (positional) argument
 */
export function assertSelfShortCircuitArguments(
    args: InvocationArgument[],
    description: string
): [Expression, Expression] {
    if (args.length == 2) {
        if (args[0].name === undefined && args[1].name === SemanticFieldNames.SELF) {
            return [args[1].value, args[0].value];
        } else if (args[0].name === SemanticFieldNames.SELF && args[1].name === undefined) {
            return [args[0].value, args[1].value];
        }
    }
    throw new RuntimeError(`Expected exactly two arguments for ${description}: self and a positional argument`);
}
