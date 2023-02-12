/**
 * Specifies how an element can be modified.
 * If multiple elements are modified at the same time, these have to be checked for consistency.
 * If null, this characteristic of the element cannot be modified
 */
export type ModificationSpecification = {
    /**
     * Entries, consisting of a start and end
     */
    [key: string]: [number, number];
} | null;

export namespace ModificationSpecification {
    /**
     * Checks if the provided specifications are consistent.
     * Not consistent if
     * - any specification is null
     * - any ranges overlap and are not identical
     * - any ranges are identical and not of the same key
     *
     * @param specifications the ModificationSpecifications to check
     * @return true if the modification can affect all specifications at the same time
     */
    export function isConsistent(specifications: ModificationSpecification[]): boolean {
        if (specifications.some((spec) => spec === null)) {
            return false;
        }
        const entries = specifications.flatMap((specification) => Object.entries(specification!));
        entries.sort((a, b) => a[1][0] - b[1][0]);
        for (let i = 1; i < entries.length; i++) {
            const entry = entries[i];
            const lastEntry = entries[i - 1];
            const currentStart = entry[1][0];
            const lastStart = lastEntry[1][0];
            if (currentStart === lastStart) {
                if (entry[0] !== lastEntry[0] || entry[1][1] !== lastEntry[1][1]) {
                    return false;
                }
            } else if (currentStart < lastEntry[1][1]) {
                return false;
            }
        }
        return true;
    }
}
