/**
 * Used to generate edits to a TextDocument
 */
export interface EditGenerator {
    /**
     * The type of this generator, identifies the engine to use
     */
    type: string;
}

/**
 * @param T the type of data it uses to generate the edit
 */
export interface EditEngine<T, G extends EditGenerator> {
    /**
     * The type of EditGenerator this handles
     */
    type: string;

    /**
     * Generates a new edit
     * @param data the data to apply
     * @param generator the generator to use
     */
    generateEdit(data: T, generator: G): string;
}
