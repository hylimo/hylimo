import { EditEngine, ParsedTemplate } from "./editEngine.js";
import { evaluateTemplate } from "./template.js";

/**
 * Edit engine for add edits
 */
export class AddEditEngine extends EditEngine {

    /**
     * Creates a new add edit engine
     * 
     * @param start the start of the edit
     * @param end the end of the edit
     * @param templates the templates for all expressions to add
     * @param indentation the indentation to use
     */
    constructor(
        start: number,
        end: number,
        private readonly templates: ParsedTemplate[],
        private readonly indentation: string
    ) {
        super(start, end);
    }

    /**
     * Evaluate the templates and generates the addment string
     * 
     * @param values the variables to apply to each template
     * @returns the generated string
     */
    apply(values: Record<string, any>[]): string {
        const newlineWithIndentation = "\n" + this.indentation;
        const value = "\n" + this.templates.map((template) => {
            return evaluateTemplate(template.template, values[template.valuesIndex], this.indentation);
        }).join(newlineWithIndentation);
        return value.replace(/\n/g, "\n" + " ".repeat(4)) + newlineWithIndentation + "}";
    }
}


