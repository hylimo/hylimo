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
    export function sortAndValidate(entries: EditGeneratorEntry[]): void {
        entries.sort((a, b) => a.start - b.start);
        for (let i = 1; i < entries.length; i++) {
            if (entries[i - 1].end > entries[i].start) {
                throw new Error("Overlapping edit generators");
            }
        }
    }
}
