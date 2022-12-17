import { Type } from "./base";

/**
 * Creats a new type with the specified name and an expected: newName reason
 * on type mismatch
 *
 * @param type the type to wrap
 * @param newName the new name
 * @returns the wrapped type
 */
export function namedType(type: Type, newName: string): Type {
    return {
        name: () => newName,
        matches(value, context) {
            const res = type.matches(value, context);
            if (res === true) {
                return true;
            } else {
                return {
                    expected: this,
                    path: []
                };
            }
        }
    };
}
