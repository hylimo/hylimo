import { NumberObject } from "../runtime/objects/numberObject.js";
import type { Type } from "./base.js";

/**
 * Number type matching only numbers
 */
export const numberType: Type = {
    name: () => "number",
    matches(value, _context) {
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

/**
 * Number type matching only finite numbers (no Infinity or NaN)
 */
export const finiteNumberType: Type = {
    name: () => "number",
    matches(value, _context) {
        if (value instanceof NumberObject && Number.isFinite(value.value)) {
            return true;
        } else {
            return {
                expected: this,
                path: []
            };
        }
    }
};
