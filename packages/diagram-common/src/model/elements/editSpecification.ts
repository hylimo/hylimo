/**
 * Specifies how an element can be modified.
 * If multiple elements are modified at the same time, these have to be checked for consistency.
 * If null, this characteristic of the element cannot be modified
 */
export interface EditSpecification {
    /**
     * Entries, consisting of a start and end
     */
    [key: string]: EditSpecificationEntry;
}

/**
 * Template entry for a edit specification
 * Can be a string, an object with a JSON logic expression, or a range in the original document with the segnal [start, end]
 */
export type TemplateEntry =
    | string
    | {
          exp: string;
      }
    | { range: [number, number] };

/**
 * Base interface for entry in a edit specification
 */
interface BaseEditSpecificationEntry {
    /**
     * The template of the edit
     */
    template: TemplateEntry[];
    /**
     * The range of the edit
     * Used for consistency checks: overlaps between replace edits with different signatures are NOT allowed
     * Overlaps between replace and add edits are not allowed
     * Overlaps between add edits NOT allowed
     */
    range: [number, number];
}

export interface AddEditSpecificationEntry extends BaseEditSpecificationEntry {
    /**
     * The type of edit
     */
    type: "add";
    /**
     * The range of the whole function
     */
    functionRange: [number, number];
}

export interface ReplaceEditSpecificationEntry extends BaseEditSpecificationEntry {
    /**
     * The type of edit
     */
    type: "replace";
}

/**
 * entry in a edit specification
 */
export type EditSpecificationEntry = AddEditSpecificationEntry | ReplaceEditSpecificationEntry;

export namespace EditSpecification {
    /**
     * Checks if the provided specification entries are consistent.
     * Not consistent if
     * - two replace edits with different signatures overlap
     * - a replace and an add edit overlap
     *
     * @param entries the EditSpecifications to check
     * @return true if the edit can affect all specifications at the same time
     */
    export function isConsistent(entries: (EditSpecificationEntry | undefined)[]): boolean {
        const definedEntries = entries.filter((entry) => entry !== undefined);
        if (definedEntries.length != entries.length) {
            return false;
        }
        definedEntries.sort((a, b) => a.range[0] - b.range[0]);
        for (let i = 1; i < entries.length; i++) {
            const entry = definedEntries[i];
            const lastEntry = definedEntries[i - 1];
            const currentStart = entry.range[0];
            const lastStart = lastEntry.range[0];
            if (currentStart === lastStart) {
                if (lastEntry.type != entry.type) {
                    return false;
                }
                if (
                    entry.type === "replace" &&
                    (entry.range[1] !== lastEntry.range[1] ||
                        !isTemplateEqual(entry.template[0], lastEntry.template[0]))
                ) {
                    return false;
                }
            } else if (currentStart < lastEntry.range[1]) {
                return false;
            }
        }
        return true;
    }

    /**
     * Checks if two template entries are equal
     *
     * @param a the first template entry
     * @param b the second template entry
     * @returns true if the template entries are equal
     */
    function isTemplateEqual(a: TemplateEntry, b: TemplateEntry): boolean {
        if (typeof a === "string" && typeof b === "string") {
            return a === b;
        }
        if (typeof a === "object" && typeof b === "object") {
            if ("exp" in a && "exp" in b) {
                return a.exp === b.exp;
            }
            if ("range" in a && "range" in b) {
                return a.range[0] === b.range[0] && a.range[1] === b.range[1];
            }
        }
        return false;
    }
}
