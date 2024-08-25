/**
 * Rounds a value to a specific precision if given
 * If no precision is given, the value is returned unchanged
 *
 * @param value the value to round
 * @param precision the precision to use
 * @returns the rounded value
 */
export function roundToPrecision(value: number, precision: number | undefined): number {
    if (precision == undefined) {
        return value;
    }
    return Math.round(value / precision) * precision;
}
