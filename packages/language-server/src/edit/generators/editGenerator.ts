/**
 * Used to generate edits to a TextDocument
 *
 * @param T the type of data it uses to generate the edit
 */
export interface EditGenerator<T> {
    /**
     * Generates a new edit
     * @param data
     */
    generateEdit(data: T): string;
}
