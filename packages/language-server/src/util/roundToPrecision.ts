/**
 * Rounds a value to a specific precision if given
 * If no precision is given, the value is returned unchanged
 *
 * @param value the value to round
 * @param precision the precision to use
 * @returns the rounded value
 */
export function roundToPrecision(value: number, precision: number | undefined): number {
    let res: number;
    if (precision === undefined) {
        res = value;
    } else {
        res = Math.round(value / precision) * precision;
    }
    // the following code is required to to weird floating point rounding behavior when precision < 1
    const fullNumber = Math.round(res);
    const remainder = res - fullNumber;
    const roundedRemainder = Math.round(remainder * 10 ** 10) / 10 ** 10;
    return fullNumber + roundedRemainder;
}
