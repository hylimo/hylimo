import { Type } from "./base";

/**
 * Or type matching if any of the provided subtypes matches
 *
 * @param types the type where any needs to match
 * @returns the generated type
 */
export function or(...types: Type[]): Type {
    const name = types.join(" | ");
    return {
        name,
        matches(value, context) {
            for (const type of types) {
                const res = type.matches(value, context);
                if (res === true) {
                    return true;
                }
            }
            return {
                reason: `expected: ${name}`,
                path: []
            };
        }
    };
}
