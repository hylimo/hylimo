import { EditEngine, ParsedTemplate } from "./editEngine.js";
import { evaluateTemplate } from "./template.js";

/**
 * Edit engine for add list entry edits
 */
export class AddArgEditEngine extends EditEngine {
    /**
     * Creates a new add list entry edit engine
     *
     * @param start the start of the range to replace, inclusive
     * @param end the end of the range to replace, exclusive
     * @param entries the entries to add
     * @param indentation the indentation to use
     * @param isMultiline whether the list is multiline
     * @param isFirst whether this is/are the first entry/entries in the list
     * @param isLast whether this is/are the last entry/entries in the list
     */
    constructor(
        start: number,
        end: number,
        private readonly entries: (ParsedTemplate & { key?: string })[],
        private readonly indentation: string,
        private readonly isMultiline: boolean,
        private readonly isFirst: boolean,
        private readonly isLast: boolean
    ) {
        super(start, end);
    }

    override async apply(values: Record<string, any>[]): Promise<string> {
        const increasedIndentation = this.indentation + " ".repeat(4);
        const evaluatedEntries = await Promise.all(
            this.entries.map(async (entry) => {
                const evaluatedTemplate = await evaluateTemplate(
                    entry.template,
                    values[entry.valuesIndex],
                    increasedIndentation
                );
                return entry.key ? `${entry.key} = ${evaluatedTemplate}` : evaluatedTemplate;
            })
        );
        const entrySpacing = this.isMultiline ? "\n" + increasedIndentation : " ";
        const argSpacing = "," + entrySpacing;
        const joinedEntries = evaluatedEntries.join(argSpacing);
        let res = "";
        if (this.isFirst) {
            res += "(";
            res += this.isMultiline ? "\n" + increasedIndentation : "";
        } else {
            res += argSpacing;
        }
        res += joinedEntries;
        if (this.isLast) {
            res += this.isMultiline ? "\n" + this.indentation : "";
            res += ")";
        } else {
            res += ",";
            res += this.isMultiline ? "\n" + increasedIndentation : " ";
        }
        return res;
    }
}

/**
 * Add list entry
 */
export interface AddArgEntry {
    /**
     * The key of the list entry
     * Only present if a named entry is added
     */
    key?: string;
    /**
     * The template to use
     */
    template: ParsedTemplate;
}
