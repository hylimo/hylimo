import { NumberObject } from "../runtime/objects/numberObject.js";
import { Type } from "./base.js";

/**
 * Number type matching only numbers
 */
export const numberType: Type = {
    name: () => "number",
    matches(value, _context) {
        if (value instanceof NumberObject) {
            return true;
        } else {
            return {
                expected: this,
                path: []
            };
        }
    }
};
