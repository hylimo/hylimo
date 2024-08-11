/**
 * Maps an object to another object
 *
 * @param value the object to map
 * @param mapper the mapper function
 * @returns the mapped object
 */
export function mapObject<T extends object, R>(
    value: T,
    mapper: (key: keyof T, value: any) => R
): { [P in keyof T]: R } {
    return Object.fromEntries(Object.entries(value).map(([key, value]) => [key, mapper(key as keyof T, value)])) as {
        [P in keyof T]: R;
    };
}
