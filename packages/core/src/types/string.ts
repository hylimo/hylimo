import { StringObject } from "../runtime/objects/string";
import { Type } from "./base";

/**
 * String type matching only strings
 */
export const stringType: Type = {
    name: "string",
    matches(value, context) {
        if (value instanceof StringObject) {
            return true;
        } else {
            return {
                reason: "expected: string",
                path: []
            };
        }
    }
};
