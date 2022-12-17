import { Type } from "./base";
import { or } from "./or";

/**
 * Null type matching only null
 */
export const nullType: Type = {
    name: () => "null",
    matches(value, context) {
        if (value === context.null) {
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
