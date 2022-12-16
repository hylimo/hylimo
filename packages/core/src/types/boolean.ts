import { BooleanObject } from "../stdlib/modules/boolean";
import { Type } from "./base";

/**
 * Boolean type matching only booleans
 */
export const booleanType: Type = {
    name: "boolean",
    matches(value, context) {
        if (value instanceof BooleanObject) {
            return true;
        } else {
            return {
                reason: "expected: boolean",
                path: []
            };
        }
    }
};
