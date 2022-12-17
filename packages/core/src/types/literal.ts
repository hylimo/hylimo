import { LiteralObject } from "../runtime/objects/literal";
import { Type } from "./base";

/**
 * Type which checks if the provided value is a specific literal
 *
 * @param value the value the literal must match
 * @returns a type checking for a specific literal
 */
export function literal(value: any): Type {
    let name: string;
    if (typeof value === "string") {
        name = `"${value}"`;
    } else {
        name = value.toString();
    }
    return {
        name,
        matches(providedValue, context) {
            if (!(providedValue instanceof LiteralObject) || providedValue.value !== value) {
                return {
                    reason: `expected: ${name}`,
                    path: []
                };
            }
            return true;
        }
    };
}
