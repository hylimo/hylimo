import { ParsedTemplateEntry } from "./template.js";

/**
 * Base class for add and replace edit engines
 */
export abstract class EditEngine {
    /**
     * Start of the range to replace, inclusive
     */
    start: number;
    /**
     * End of the range to replace, exclusive
     */
    end: number;

    /**
     * Creates a new edit engine
     *
     * @param start start of the range to replace, inclusive
     * @param end end of the range to replace, exclusive
     */
    constructor(start: number, end: number) {
        this.start = start;
        this.end = end;
    }

    /**
     * Evaluate the templates and generates the string which will replace the range [start, end)
     *
     * @param values the variables to apply to each template
     * @returns the generated string
     */
    abstract apply(values: Record<string, any>[]): Promise<string>;
}

/**
 * Entry for the add edit engine
 */
export interface ParsedTemplate {
    /**
     * The index of the values to use
     */
    valuesIndex: number;
    /**
     * The template of the entry
     */
    template: ParsedTemplateEntry[];
}
