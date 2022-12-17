import { Type } from "./base";

/**
 * Any type accepting all values
 */
export const anyType: Type = {
    name: () => "any",
    matches(value, context) {
        return true;
    }
};
