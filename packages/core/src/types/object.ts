import { FullObject } from "../runtime/objects/fullObject";
import { Type } from "./base";

/**
 * Generates an object type
 *
 * @param types entry types
 * @returns the generated type
 */
export function objectType(types: Map<string | number, Type> = new Map()): Type {
    const name = `{ ${[...types.entries()].map(([key, type]) => `${key}: ${type.name}`).join(", ")} }`;
    return {
        name,
        matches(value, context) {
            if (!(value instanceof FullObject)) {
                return {
                    reason: `expected: object`,
                    path: []
                };
            }
            for (const [key, entryType] of types.entries()) {
                const entryValue = value.getField(key, context);
                const entryRes = entryType.matches(entryValue, context);
                if (entryRes !== true) {
                    entryRes.path.unshift(key.toString());
                    return entryRes;
                }
            }
            return true;
        }
    };
}
