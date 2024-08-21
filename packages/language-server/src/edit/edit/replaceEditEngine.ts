import { EditEngine, ParsedTemplate } from "./editEngine.js";
import { evaluateTemplate } from "./template.js";

/**
 * Edit engine for replace edits
 */
export class ReplaceEditEngine extends EditEngine {
    /**
     * Creates a new replace edit engine
     *
     * @param start the start of the edit
     * @param end the end of the edit
     * @param template the template to use
     * @param indentation the indentation to use
     */
    constructor(
        start: number,
        end: number,
        private readonly template: ParsedTemplate,
        private readonly indentation: string
    ) {
        super(start, end);
    }

    override apply(values: Record<string, any>[]): string {
        return evaluateTemplate(this.template.template, values[this.template.valuesIndex], this.indentation);
    }
}
