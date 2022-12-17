import { AbstractFunctionObject } from "../runtime/objects/function";
import { Type } from "./base";

/**
 * Function type matching only functions (both normal and native)
 */
export const functionType: Type = {
    name: () => "function",
    matches(value, context) {
        if (value instanceof AbstractFunctionObject) {
            return true;
        } else {
            return {
                expected: this,
                path: []
            };
        }
    }
};
