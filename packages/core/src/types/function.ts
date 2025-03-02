import { AbstractFunctionObject } from "../runtime/objects/functionObject.js";
import type { Type } from "./base.js";

/**
 * Function type matching only functions (both normal and native)
 */
export const functionType: Type = {
    name: () => "function",
    matches(value, _context) {
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
