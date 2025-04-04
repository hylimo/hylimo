import { FullObject } from "../runtime/objects/fullObject.js";
import { assertNumber } from "../stdlib/typeHelpers.js";
import type { Type } from "./base.js";
import { numberType } from "./number.js";

/**
 * Generates a list type
 * If no type is provided, only the structure of the list object is checked, but not its values.
 *
 * @param type the type of the entries if provided
 * @returns the generated type
 */
export function listType(type?: Type): Type {
    return {
        name: () => {
            if (type != undefined) {
                return `${type?.name()}[]`;
            } else {
                return "list";
            }
        },
        matches(value, context) {
            if (!(value instanceof FullObject)) {
                return {
                    expected: this,
                    path: []
                };
            }
            const lengthValue = value.getLocalField("length", context).value;
            const lengthRes = numberType.matches(lengthValue, context);
            if (lengthRes !== true) {
                lengthRes.path.unshift("length");
                return lengthRes;
            }
            if (type === undefined) {
                return true;
            }
            const length = assertNumber(lengthValue);
            for (let i = 0; i < length; i++) {
                const posValue = value.getLocalField(i, context).value;
                const posRes = type.matches(posValue, context);
                if (posRes !== true) {
                    posRes.path.unshift(i.toString());
                    return posRes;
                }
            }
            return true;
        }
    };
}
