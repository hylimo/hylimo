import { LiteralObject } from "../runtime/objects/literal";
import { Type } from "./base";

/**
 * Type which checks if the provided value is a specific literal
 *
 * @param value the value the literal must match
 * @returns a type checking for a specific literal
 */
export function literal(value: any): Type {
    return {
        name() {
            if (typeof value === "string") {
                return `"${value}"`;
            } else {
                return value.toString();
            }
        },
        matches(providedValue, _context) {
            if (!(providedValue instanceof LiteralObject) || providedValue.value !== value) {
                return {
                    expected: this,
                    path: []
                };
            }
            return true;
        }
    };
}
