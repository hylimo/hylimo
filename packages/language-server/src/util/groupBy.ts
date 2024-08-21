/**
 * GroupBy replacement until we can use es2024
 * 
 * @param values the values to group
 * @param keyFn key extraction function
 * @returns the grouped values
 */
export function groupBy<K, V>(values: V[], keyFn: (value: V) => K): Map<K, V[]> {
    const result = new Map<K, V[]>();
    for (const value of values) {
        const key = keyFn(value);
        const group = result.get(key);
        if (group) {
            group.push(value);
        } else {
            result.set(key, [value]);
        }
    }
    return result;
}