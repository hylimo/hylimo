import { TemplateEntry } from "@hylimo/diagram-common";
import { TextDocument } from "vscode-languageserver-textdocument";
import { apply, RulesLogic } from "json-logic-js";
import { Range, uinteger } from "vscode-languageserver";

/**
 * Parsed template entry
 */
export type ParsedTemplateEntry = string | ParsedExpressionTemplateEntry;

/**
 * JSON-Logic expression template entry
 */
export interface ParsedExpressionTemplateEntry {
    exp: RulesLogic;
}

/**
 * Parses a template into a parsed template
 *
 * @param template the template to parse
 * @param textDocument the text document to use for range entries
 * @param indentation the indentation to add to string entries after line breaks
 * @returns the parsed template
 */
export function parseTemplate(
    template: TemplateEntry[],
    textDocument: TextDocument,
    indentation: string
): ParsedTemplateEntry[] {
    const result: ParsedTemplateEntry[] = [];
    for (const entry of template) {
        if (typeof entry === "string") {
            result.push(entry.replace(/\n/g, "\n" + indentation));
        } else if ("exp" in entry) {
            result.push({
                exp: JSON.parse(entry.exp)
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
export function evaluateTemplate(
    template: ParsedTemplateEntry[],
    values: Record<string, any>,
    indentation: string
): string {
    return template
        .map((entry) => {
            if (typeof entry === "string") {
                return entry;
            } else if ("exp" in entry) {
                return `${apply(entry.exp, values)}`.replace(/\n/g, "\n" + indentation);
            } else {
                throw new Error("Unknown template entry type");
            }
        })
        .join("");
}
