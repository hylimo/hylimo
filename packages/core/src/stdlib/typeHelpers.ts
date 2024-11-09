import { ExecutableListEntry } from "../runtime/ast/executableListEntry.js";
import { ExecutableExpression } from "../runtime/ast/executableExpression.js";
import { BaseObject } from "../runtime/objects/baseObject.js";
import { BooleanObject } from "../runtime/objects/booleanObject.js";
import { FullObject } from "../runtime/objects/fullObject.js";
import { AbstractFunctionObject } from "../runtime/objects/functionObject.js";
import { NumberObject } from "../runtime/objects/numberObject.js";
import { StringObject } from "../runtime/objects/stringObject.js";
import { RuntimeError } from "../runtime/runtimeError.js";
import { SemanticFieldNames } from "../runtime/semanticFieldNames.js";
import { WrapperObject } from "../runtime/objects/wrapperObject.js";
import { NullObject } from "../runtime/objects/nullObject.js";

/**
 * Helper to check that an object is a StringObject, throws an error if not
 *
 * @param value the value to check
 * @param description the description of the value, part of the error message
 * @returns the value of the StringObject
 */
export function assertString(value: BaseObject, description = ""): string {
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
export function isString(value: BaseObject): value is StringObject {
    return value instanceof StringObject;
}

/**
 * Helper to check that an object is a NumberObject, throws an error if not
 *
 * @param value the value to check
 * @param description the description of the value, part of the error message
 * @returns the value of the NumberObject
 */
export function assertNumber(value: BaseObject, description = ""): number {
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
export function isNumber(value: BaseObject): value is NumberObject {
    return value instanceof NumberObject;
}

/**
 * Asserts that the value is a string or a number, and returns its value
 *
 * @param value the value to check
 * @returns the string or number value
 */
export function assertIndex(value: BaseObject): string | number {
    if (value instanceof StringObject) {
        return value.value;
    } else if (value instanceof NumberObject) {
        return value.value;
    } else {
        throw new RuntimeError("Only string and number are supported as index types");
    }
}

/**
 * Helper to check that an object is a BooleanObject, throws an error if not
 *
 * @param value the value to check
 * @param description the description of the value, part of the error message
 * @returns the value of the BooleanObject
 */
export function assertBoolean(value: BaseObject, description = ""): boolean {
    if (!(value instanceof BooleanObject)) {
        throw new RuntimeError(`${description} is not a boolean`);
    }
    return value.value;
}

/**
 * Checks if a value is a BooleanObject
 *
 * @param value the value to check
 * @returns true iff it is a BooleanObject
 */
export function isBoolean(value: BaseObject): value is BooleanObject {
    return value instanceof BooleanObject;
}

/**
 * Helper to check that an object is a AbstractFunctionObject, throws an error if not
 *
 * @param value the value to check
 * @param description the description of the value, part of the error message
 */
export function assertFunction(value: BaseObject, description = ""): asserts value is AbstractFunctionObject<any> {
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
export function assertObject(value: BaseObject, description = ""): asserts value is FullObject {
    if (!(value instanceof FullObject)) {
        throw new RuntimeError(`${description} is not an object`);
    }
}

/**
 * Checks if a value is a FullObject
 *
 * @param value the value to check
 * @returns true iff it is a FullObject
 */
export function isObject(value: BaseObject): value is FullObject {
    return value instanceof FullObject;
}

/**
 * Helper to check that an object is a WrapperObject, throws an error if not
 *
 * @param value the value to check
 * @param description the description of the value, part of the error message
 */
export function assertWrapperObject(value: BaseObject, description = ""): asserts value is WrapperObject<any> {
    if (!(value instanceof WrapperObject)) {
        throw new RuntimeError(`${description} is not a wrapper object`);
    }
}

/**
 * Checks if a value is a WrapperObject
 *
 * @param value the value to check
 * @returns true iff it is a WrapperObject
 */
export function isWrapperObject(value: BaseObject): value is WrapperObject<any> {
    return value instanceof WrapperObject;
}

/**
 * Checks if a value is a FullObject
 *
 * @param value the value to check
 * @returns true iff it is a FullObject
 */
export function isNull(value: BaseObject): value is NullObject {
    return value instanceof NullObject;
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
    args: ExecutableListEntry[],
    description: string
): [ExecutableExpression<any>, ExecutableExpression<any>] {
    if (args.length == 2) {
        if (args[0].name === undefined && args[1].name === SemanticFieldNames.SELF) {
            return [args[1].value, args[0].value];
        } else if (args[0].name === SemanticFieldNames.SELF && args[1].name === undefined) {
            return [args[0].value, args[1].value];
        }
    }
    throw new RuntimeError(`Expected exactly two arguments for ${description}: self and a positional argument`);
}
