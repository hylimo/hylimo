import { BooleanObject } from "../runtime/objects/booleanObject";
import { Type } from "./base";

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
