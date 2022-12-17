import { literal } from "./literal";
import { or } from "./or";

/**
 * Generates a type for an enum
 *
 * @param type the enum to transform to a type
 * @returns the generated type
 */
export function enumType(type: { [key: string]: string }) {
    return or(...Object.values(type).map((value) => literal(value)));
}
