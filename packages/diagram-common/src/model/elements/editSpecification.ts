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
 * Can be a template string, or a range in the original document with the signature [start, end]
 */
export type TemplateEntry = string | { range: [number, number] };

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

/**
 * An entry in an edit specification which adds an expression to a function body
 */
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

/**
 * An entry in an edit specification which replaces an expression
 */
export interface ReplaceEditSpecificationEntry extends BaseEditSpecificationEntry {
    /**
     * The type of edit
     */
    type: "replace";
}

/**
 * An entry in an edit specification which adds an argument to a function call
 */
export interface AddArgEditSpecificationEntry extends BaseEditSpecificationEntry {
    /**
     * The type of edit
     */
    type: "add-arg";
    /**
     * The key of the list entry
     */
    key: string | number;
    /**
     * The range of the list, this includes the brackets
     */
    listRange: [number, number];
    /**
     * Will this be the first entry in the list
     */
    isFirst: boolean;
    /**
     * Will this be the last entry in the list
     */
    isLast: boolean;
}

/**
 * entry in a edit specification
 */
export type EditSpecificationEntry =
    | AddEditSpecificationEntry
    | ReplaceEditSpecificationEntry
    | AddArgEditSpecificationEntry;

export namespace EditSpecification {
    /**
     * Checks if the provided grouped edit specification entries are consistent.
     * Not consistent if
     * - two replace edits with different signatures or groups overlap
     * - a replace and an add edit overlap
     *
     * @param entries the EditSpecifications to check
     * @return true if the edit can affect all specifications at the same time
     */
    export function isConsistent(entries: (EditSpecificationEntry | undefined)[][]): boolean {
        const entriesWithGroup = entries.flatMap((group, groupIndex) =>
            group.map((entry) => (entry ? { entry, group: groupIndex } : undefined))
        );
        const definedEntries = entriesWithGroup.filter((entry) => entry !== undefined);
        if (definedEntries.length != entriesWithGroup.length) {
            return false;
        }
        definedEntries.sort((a, b) => a.entry.range[0] - b.entry.range[0]);
        for (let i = 1; i < entries.length; i++) {
            const { entry: entry, group } = definedEntries[i];
            const { entry: lastEntry, group: lastGroup } = definedEntries[i - 1];
            const currentStart = entry.range[0];
            const lastStart = lastEntry.range[0];
            if (currentStart === lastStart) {
                if (lastEntry.type != entry.type) {
                    return false;
                }
                if (lastGroup != group) {
                    return false;
                }
                if (
                    entry.type === "replace" &&
                    (entry.range[1] !== lastEntry.range[1] || !isTemplateEqual(entry.template, lastEntry.template))
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
     * Checks if two entries are equal
     *
     * @param a the first entry
     * @param b the second entry
     * @returns true if the entries are equal
     */
    export function isEntryEqual(a: EditSpecificationEntry, b: EditSpecificationEntry): boolean {
        if (a.type !== b.type || a.range[0] !== b.range[0] || a.range[1] !== b.range[1]) {
            return false;
        }
        return isTemplateEqual(a.template, b.template);
    }

    /**
     * Checks if two templates are equal
     *
     * @param a the first template
     * @param b the second template
     * @returns true if the template entries are equal
     */
    function isTemplateEqual(a: TemplateEntry[], b: TemplateEntry[]): boolean {
        if (a.length !== b.length) {
            return false;
        }
        for (let i = 0; i < a.length; i++) {
            const first = a[i];
            const second = b[i];
            if (typeof first === "string" && typeof second === "string") {
                if (first !== second) {
                    return false;
                }
            } else if (typeof first !== "string" && typeof second !== "string") {
                if (first.range[0] !== second.range[0] || first.range[1] !== second.range[1]) {
                    return false;
                }
            } else {
                return false;
            }
        }
        return true;
    }
}
