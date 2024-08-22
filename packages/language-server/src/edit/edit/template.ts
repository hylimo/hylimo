import { TemplateEntry } from "@hylimo/diagram-common";
import { TextDocument } from "vscode-languageserver-textdocument";
import { Range } from "vscode-languageserver";
import jsonata, { Expression } from "jsonata";

/**
 * Parsed template entry
 */
export type ParsedTemplateEntry = string | ParsedExpressionTemplateEntry;

/**
 * JSON-Logic expression template entry
 */
export interface ParsedExpressionTemplateEntry {
    exp: Expression;
}

/**
 * Parses a template into a parsed template
 *
 * @param template the template to parse
 * @param textDocument the text document to use for range entries
 * @returns the parsed template
 */
export function parseTemplate(
    template: TemplateEntry[],
    textDocument: TextDocument
): ParsedTemplateEntry[] {
    const result: ParsedTemplateEntry[] = [];
    for (const entry of template) {
        if (typeof entry === "string") {
            result.push({
                exp: jsonata(entry)
            });
        } else if ("range" in entry) {
            result.push(
                textDocument.getText(
                    Range.create(textDocument.positionAt(entry.range[0]), textDocument.positionAt(entry.range[1]))
                )
            );
        } else {
            throw new Error("Unknown template entry type");
        }
    }
    return result;
}

/**
 * Evaluates a parsed template with the given values
 *
 * @param template the parsed template
 * @param values the values for expressions
 * @param indentation the indentation to add to string entries after line breaks
 * @returns the evaluated template
 */
export async function evaluateTemplate(
    template: ParsedTemplateEntry[],
    values: Record<string, any>,
    indentation: string
): Promise<string> {
    const parts = await Promise.all(
        template.map(async (entry) => {
            if (typeof entry === "string") {
                return entry;
            } else if ("exp" in entry) {
                return `${await entry.exp.evaluate(values)}`.replace(/\n/g, "\n" + indentation);
            } else {
                throw new Error("Unknown template entry type");
            }
        })
    );
    return parts.join("");
}
