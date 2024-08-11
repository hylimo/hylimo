import { literal } from "./literal.js";
import { or } from "./or.js";

/**
 * Generates a type for an enum
 *
 * @param type the enum to transform to a type
 * @returns the generated type
 */
export function enumType(type: { [key: string]: string }) {
    return or(...Object.values(type).map((value) => literal(value)));
}
