import { StringObject } from "../runtime/objects/stringObject.js";
import type { Type } from "./base.js";

/**
 * String type matching only strings
 */
export const stringType: Type = {
    name: () => "string",
    matches(value, _context) {
        if (value instanceof StringObject) {
            return true;
        } else {
            return {
                expected: this,
                path: []
            };
        }
    }
};
