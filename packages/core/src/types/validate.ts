import { Expression } from "../ast/expression.js";
import { InterpreterContext } from "../runtime/interpreter/interpreterContext.js";
import { BaseObject } from "../runtime/objects/baseObject.js";
import { RuntimeError } from "../runtime/runtimeError.js";
import { Type } from "./base.js";

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
