import { Type } from "./base.js";
import { or } from "./or.js";

/**
 * Null type matching only null
 */
export const nullType: Type = {
    name: () => "null",
    matches(value) {
        if (value.isNull) {
            return true;
        } else {
            return {
                expected: this,
                path: []
            };
        }
    }
};

/**
 * Creates a new type with the provided type or null
 *
 * @param type the type to wrap
 * @returns a new type which matches the provided type or null
 */
export function optional(type: Type): Type {
    return or(type, nullType);
}
