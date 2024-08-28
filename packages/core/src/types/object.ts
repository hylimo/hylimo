import { FullObject } from "../runtime/objects/fullObject.js";
import { Type } from "./base.js";

/**
 * Generates an object type
 *
 * @param types entry types
 * @returns the generated type
 */
export function objectType(types: Map<string | number, Type> = new Map()): Type {
    return {
        name() {
            return `{ ${[...types.entries()].map(([key, type]) => `${key}: ${type.name()}`).join(", ")} }`;
        },
        matches(value, context) {
            if (!(value instanceof FullObject)) {
                return {
                    expected: this,
                    path: []
                };
            }
            for (const [key, entryType] of types.entries()) {
                const entryValue = value.getFieldValue(key, context);
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
