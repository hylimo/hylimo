import { NumberObject } from "../runtime/objects/numberObject";
import { Type } from "./base";

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
