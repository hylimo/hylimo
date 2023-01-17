import { EditGenerator } from "./generators/editGenerator";

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
    generator: EditGenerator<unknown>;
    /**
     * Some metadata used to identify the generator
     */
    meta: any;
}
