import { InterpreterContext } from "../runtime/interpreter/interpreterContext.js";
import { WrapperObject } from "../runtime/objects/wrapperObject.js";
import { Type } from "./base.js";

/**
 * Generates a wrapper object type
 *
 * @param name the name of the type
 * @param matches validates the wrapped object
 * @returns the generated type
 */
export function wrapperObjectType(
    name: string,
    matches: (value: WrapperObject<any>, context: InterpreterContext) => boolean
): Type {
    return {
        name: () => name,
        matches(value, context) {
            if (!(value instanceof WrapperObject) || !matches(value, context)) {
                return {
                    expected: this,
                    path: []
                };
            }
            return true;
        }
    };
}
