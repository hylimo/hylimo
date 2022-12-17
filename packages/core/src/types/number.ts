import { NumberObject } from "../runtime/objects/number";
import { Type } from "./base";

/**
 * Number type matching only numbers
 */
export const numberType: Type = {
    name: () => "number",
    matches(value, context) {
        if (value instanceof NumberObject) {
            return true;
        } else {
            return {
                expected: this,
                path: []
            };
        }
    }
};
