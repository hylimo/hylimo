import { FullObject } from "../runtime/objects/fullObject.js";
import type { Type } from "./base.js";
import { SemanticFieldNames } from "../runtime/semanticFieldNames.js";

/**
 * Generates a map type for an object where all values (except proto) have the same type.<br>
 * The key type does not matter as it can only be string or int anyways.
 *
 * @param valueType the type all values except the proto field should have should have
 * @returns the generated type
 */
export function mapType(valueType: Type): Type {
    return {
        name() {
            return `map[ string | number = ${valueType.name()} ]`;
        },
        matches(value, context) {
            if (!(value instanceof FullObject)) {
                return {
                    expected: this,
                    path: []
                };
            }
            const object = value as FullObject;
            for (const [key, newValue] of object.fields) {
                if (key === SemanticFieldNames.PROTO) continue;
                const matches = valueType.matches(newValue.value, context);
                if (matches !== true) {
                    matches.path.unshift(key.toString());
                    return matches;
                }
            }
            return true;
        }
    };
}
