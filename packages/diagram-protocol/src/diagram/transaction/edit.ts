/**
 * Edit entry in a transaction
 *
 * @template V the variables type
 * @template T the types type
 */
export interface Edit<V extends Record<string, any> = Record<string, any>, T extends string = string> {
    /**
     * The values provided to the edit
     */
    values: V;
    /**
     * The type of edits to perform
     * Only required on the first action of a transaction, is ignored on subsequent actions
     */
    types?: T[];
    /**
     * The elements affected by the edit
     * Only required on the first action of a transaction, is ignored on subsequent actions
     */
    elements?: string[];
}
