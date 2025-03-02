import type { Type } from "./base.js";

/**
 * Or type matching if any of the provided subtypes matches
 *
 * @param types the type where any needs to match
 * @returns the generated type
 */
export function or(...types: Type[]): Type {
    return {
        name: () => types.map((type) => type.name()).join(" | "),
        matches(value, context) {
            for (const type of types) {
                const res = type.matches(value, context);
                if (res === true) {
                    return true;
                }
            }
            return {
                expected: this,
                path: []
            };
        }
    };
}
