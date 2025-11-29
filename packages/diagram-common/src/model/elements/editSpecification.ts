import { groupBy } from "../../common/groupBy.js";

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
    /**
     * The number of edits necessary to insert entries before this one
     */
    requiredPreceeding: number | undefined;
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
     * - any provided entry is undefined
     * - two entries of different type overlap
     * - two replace edits with different signatures or groups overlap
     * - an add arg edit has not the exact required amount of preceeding entries
     *
     * @param entries the EditSpecifications to check
     * @return true if the edit can affect all specifications at the same time
     */
    export function isConsistent(entries: (EditSpecificationEntry | undefined)[][]): boolean {
        const entriesWithGroup: (IndexedModificationSpecificationEntry | undefined)[] = entries.flatMap(
            (group, groupIndex) => group.map((entry) => (entry ? { spec: entry, index: groupIndex } : undefined))
        );
        const definedEntries = entriesWithGroup.filter((entry) => entry !== undefined);
        if (definedEntries.length != entriesWithGroup.length) {
            return false;
        }
        definedEntries.sort((a, b) => a.spec.range[0] - b.spec.range[0]);
        for (let i = 1; i < definedEntries.length; i++) {
            const { spec, index } = definedEntries[i];
            const { spec: lastSpec, index: lastIndex } = definedEntries[i - 1];
            const currentStart = spec.range[0];
            const lastStart = lastSpec.range[0];
            if (currentStart === lastStart) {
                if (lastSpec.type != spec.type) {
                    return false;
                }
                if (spec.type !== "replace") {
                    continue;
                }
                if (lastIndex != index) {
                    return false;
                }
                if (spec.range[1] !== lastSpec.range[1] || !isTemplateEqual(spec.template, lastSpec.template)) {
                    return false;
                }
            } else if (currentStart < lastSpec.range[1]) {
                return false;
            }
        }
        return isAddArgEditsConsistent(definedEntries);
    }

    /**
     * Checks that exactly the amount of required preceeding entries are present for all add argument edits
     *
     * @param entries the entries to check
     * @returns true if the required preceeding entries are consistent
     */
    function isAddArgEditsConsistent(entries: IndexedModificationSpecificationEntry[]): boolean {
        const addArgEdits = entries.filter((entry) => IndexedModificationSpecificationEntry.is(entry, "add-arg"));
        const groupedEntries = groupBy(addArgEdits, (entry) => entry.spec.listRange[0]);
        for (const group of groupedEntries.values()) {
            const uniqueEdits = IndexedModificationSpecificationEntry.computeSortedUniqueAddArgEdits(group);
            for (let i = 0; i < uniqueEdits.length; i++) {
                if (
                    uniqueEdits[i].spec.requiredPreceeding != undefined &&
                    uniqueEdits[i].spec.requiredPreceeding != i
                ) {
                    return false;
                }
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

/**
 * Modification specification entry with an index
 *
 * @template T the type of the specification
 */
export interface IndexedModificationSpecificationEntry<T extends EditSpecificationEntry = EditSpecificationEntry> {
    /**
     * The index of the used values when evaluating the template
     */
    index: number;
    /**
     * The edit specification entry
     */
    spec: T;
}

export namespace IndexedModificationSpecificationEntry {
    /**
     * Computes the sorted unique add list entry edits
     * Removes duplicates (same index, key and template) and sorts the edits with numeric keys
     *
     * @param edits the edits to filter and sort
     * @returns the sorted unique add list entry edits
     */
    export function computeSortedUniqueAddArgEdits(
        edits: IndexedModificationSpecificationEntry<AddArgEditSpecificationEntry>[]
    ): IndexedModificationSpecificationEntry<AddArgEditSpecificationEntry>[] {
        const uniqueEdits = [
            ...new Map(
                edits.map((edit) => {
                    const spec = edit.spec;
                    return [`${edit.index} ${spec.key} ${spec.template}`, edit] as const;
                })
            ).values()
        ];
        const namedEdits = [];
        const indexedEdits = [];
        for (const edit of uniqueEdits) {
            if (typeof edit.spec.key === "string") {
                namedEdits.push(edit);
            } else {
                indexedEdits.push(edit);
            }
        }
        indexedEdits.sort((a, b) => (a.spec.key as number) - (b.spec.key as number));
        const sortedEdits = [...indexedEdits, ...namedEdits];
        return sortedEdits;
    }

    /**
     * Checks if the provided entry is of the given type
     *
     * @param entry the entry to check
     * @param type the type to check for
     * @returns true if the entry is of the given type
     */
    export function is<K extends EditSpecificationEntry["type"]>(
        entry: IndexedModificationSpecificationEntry,
        type: K
    ): entry is IndexedModificationSpecificationEntry<EditSpecificationEntry & { type: K }> {
        return entry.spec.type === type;
    }
}
