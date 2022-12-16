import { FullObject } from "../runtime/objects/fullObject";
import { assertNumber } from "../stdlib/typeHelpers";
import { Type } from "./base";
import { numberType } from "./number";

/**
 * Generates a list type
 * If no type is provided, only the structure of the list object is checked, but not its values.
 *
 * @param type the type of the entries if provided
 * @returns the generated type
 */
export function listType(type?: Type): Type {
    const name = `${type}[]`;
    return {
        name,
        matches(value, context) {
            if (!(value instanceof FullObject)) {
                return {
                    reason: `expected: ${name}`,
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
