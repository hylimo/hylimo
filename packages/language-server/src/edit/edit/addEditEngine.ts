import { EditEngine, ParsedTemplate } from "./editEngine.js";
import { evaluateTemplate } from "./template.js";

/**
 * Edit engine for add edits
 */
export class AddEditEngine extends EditEngine {
    /**
     * Creates a new add edit engine
     *
     * @param start the start of the range to replace, inclusive
     * @param end the end of the range to replace, exclusive
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
    override async apply(values: Record<string, any>[]): Promise<string> {
        const newlineWithIndentation = "\n" + this.indentation;
        const evaluatedTemplates = await Promise.all(
            this.templates.map(async (template) => {
                return await evaluateTemplate(template.template, values[template.valuesIndex], this.indentation);
            })
        );
        const value = newlineWithIndentation + evaluatedTemplates.join(newlineWithIndentation);
        return value.replace(/\n/g, "\n" + " ".repeat(4)) + newlineWithIndentation + "}";
    }
}
