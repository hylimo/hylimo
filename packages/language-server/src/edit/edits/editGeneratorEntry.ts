import { EditGenerator } from "../generators/editGenerator";

/**
 * Entry von an EditGenerator which defines the generator, a range, and some metadata
 */
export interface EditGeneratorEntry {
    /**
     * Start position, inclusive
     */
    start: number;
    /**
     * End position, exclusive
     */
    end: number;
    /**
     * The generator to use
     */
    generator: EditGenerator;
    /**
     * Some metadata used to identify the generator
     */
    meta: any;
}

export namespace EditGeneratorEntry {
    /**
     * Sorts the entries in-place by start position and validates that they do not overlap
     * Throws an error if they do overlap.
     *
     * @param entries the entries to sort and validate
     */
    export function sortAndValidate(entries: EditGeneratorEntry[]): EditGeneratorEntry[] {
        const newGenerators: EditGeneratorEntry[] = [];
        entries.sort((a, b) => a.start - b.start);
        newGenerators.push(entries[0]);
        for (let i = 1; i < entries.length; i++) {
            const entry = entries[i];
            const lastEntry = entries[i - 1];
            if (entry.start === lastEntry.start && entry.end === lastEntry.end) {
                continue;
            } else if (entries[i - 1].end > entries[i].start) {
                throw new Error("Overlapping edit generators");
            }
            newGenerators.push(entry);
        }
        return newGenerators;
    }
}
