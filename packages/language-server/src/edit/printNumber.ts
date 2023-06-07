/**
 * Renders a number to a string.
 * @param value the number to render
 * @returns the rendered string
 */
export function printNumber(value: number): string {
    return value.toFixed(9).replace(/\.?0+$/, "");
}
