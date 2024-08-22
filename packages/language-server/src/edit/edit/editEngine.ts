import { ParsedTemplateEntry } from "./template.js";

/**
 * Base class for add and replace edit engines
 */
export abstract class EditEngine {
    /**
     * Start position, inclusive
     */
    start: number;
    /**
     * End position, exclusive
     */
    end: number;

    constructor(start: number, end: number) {
        this.start = start;
        this.end = end;
    }

    /**
     * Evaluate the templates and generates the addment string
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
