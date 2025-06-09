import type { Expression } from "../ast/expression.js";
import type { InterpreterContext } from "../runtime/interpreter/interpreterContext.js";
import type { BaseObject } from "../runtime/objects/baseObject.js";
import { RuntimeError } from "../runtime/runtimeError.js";
import { assertObject } from "../stdlib/typeHelpers.js";
import type { Type } from "./base.js";

/**
 * Checks that a value matches a type and throws an error if not
 *
 * @param type the target type
 * @param messageStart the start of the error message
 * @param value the value to validate
 * @param context required InterpreterContext
 * @param source cause of the error
 */
export function validate(
    type: Type,
    messageStart: string,
    value: BaseObject,
    context: InterpreterContext,
    sourceGenerator: () => Expression | undefined = () => undefined
) {
    const typeCheckRes = type.matches(value, context);
    if (typeCheckRes !== true) {
        const reason = `expected: ${typeCheckRes.expected.name()}`;
        let reasonMessagePart: string;
        if (typeCheckRes.path.length > 0) {
            reasonMessagePart = `at .${typeCheckRes.path.join(".")}: ${reason}`;
        } else {
            reasonMessagePart = reason;
        }
        const message = `${messageStart}: \n${reasonMessagePart}`;
        const error = new RuntimeError(message);
        const source = sourceGenerator();
        if (source) {
            error.interpretationStack.push(source);
        }
        throw error;
    }
}

/**
 * Validates an object
 * Checks that all fields are valid
 *
 * @param object the scope object
 * @param context the interpreter context
 * @param properties the properties of the scope object
 * @throws if the scope object is invalid
 */
export function validateObject(
    object: BaseObject,
    context: InterpreterContext,
    properties: {
        name: string;
        type: Type;
    }[]
): void {
    assertObject(object);
    for (const property of properties) {
        const propertyValue = object.getSelfFieldValue(property.name, context);
        validate(property.type, `Invalid value for ${property.name}`, propertyValue, context);
    }
}
