import type { Type } from "./base.js";

/**
 * Any type accepting all values
 */
export const anyType: Type = {
    name: () => "any",
    matches(_value, _context) {
        return true;
    }
};
