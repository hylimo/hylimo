import { BooleanObject } from "../runtime/objects/booleanObject.js";
import type { Type } from "./base.js";

/**
 * Boolean type matching only booleans
 */
export const booleanType: Type = {
    name: () => "boolean",
    matches(value, _context) {
        if (value instanceof BooleanObject) {
            return true;
        } else {
            return {
                expected: this,
                path: []
            };
        }
    }
};
