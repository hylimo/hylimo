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
     * @param indentation the indentation of the function itself, without the increased indentation for the body
     */
    constructor(
        start: number,
        end: number,
        private readonly templates: ParsedTemplate[],
        private readonly indentation: string
    ) {
        super(start, end);
    }

    override async apply(values: Record<string, any>[]): Promise<string> {
        const increasedIndentation = this.indentation + " ".repeat(4);
        const newlineWithIndentation = "\n" + increasedIndentation;
        const evaluatedTemplates = await Promise.all(
            this.templates.map(async (template) => {
                return await evaluateTemplate(template.template, values[template.valuesIndex], increasedIndentation);
            })
        );
        // join the expressions with a newline and the increased indentation
        const expressions = newlineWithIndentation + evaluatedTemplates.join(newlineWithIndentation);
        return expressions + "\n" + this.indentation + "}";
    }
}
