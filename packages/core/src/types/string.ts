import { StringObject } from "../runtime/objects/stringObject";
import { Type } from "./base";

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
