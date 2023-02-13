import { FullObject, FunctionExpression } from "@hylimo/core";
import { Range } from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { EditGeneratorEntry } from "../editGeneratorEntry";
import { FieldEntryGenerator } from "../generators/fieldEntryGenerator";

/**
 * Generates a new EditGeneratorEntry to add fields to a scope (and create the scope if it does not exist yet)
 *
 * @param element the element where to add the fields
 * @param scopeName the name of the scope where to add the fields
 * @param document the document in which the element is located
 * @param meta metadata to add to the generated entry
 * @returns the generated entry
 */
export function generateAddFieldToScopeGenerator(
    element: FullObject,
    scopeName: string,
    document: TextDocument,
    meta: any
): EditGeneratorEntry {
    const scopes = element.getLocalFieldOrUndefined("scopes")?.value as FullObject;
    const scope = scopes.getLocalFieldOrUndefined(scopeName)?.source;
    if (scope != undefined) {
        if (!(scope instanceof FunctionExpression)) {
            throw new Error("scope must be a function expression");
        }
        const position = scope.position!;
        if (position.startLine == position.endLine) {
            const innerText = document.getText(
                Range.create(document.positionAt(position.startOffset + 1), document.positionAt(position.endOffset))
            );
            const innerTextWithoutWhitespace = innerText.replace(/^\s*/, "");
            const indentation = extractIndentation(document, position.startLine);
            const innerIndentation = indentation + " ".repeat(4);
            let prefix: string;
            if (innerTextWithoutWhitespace == "") {
                prefix = "\n";
            } else {
                prefix = `\n${innerIndentation}${innerTextWithoutWhitespace}\n`;
            }
            return {
                start: position.startOffset + 1,
                end: position.endOffset,
                generator: new FieldEntryGenerator(prefix, `\n${indentation}}`, innerIndentation),
                meta
            };
        } else {
            const indentation = extractIndentation(document, position.startLine);
            return {
                start: position.startOffset + 1,
                end: position.startOffset + 1,
                generator: new FieldEntryGenerator("\n", "\n", indentation + " ".repeat(4)),
                meta
            };
        }
    } else {
        const source = element.getLocalFieldOrUndefined("source")?.source;
        if (source == undefined) {
            throw new Error("element must have a source");
        }
        const indentation = extractIndentation(document, source.position!.startLine);
        return {
            start: source.position!.endOffset + 1,
            end: source.position!.endOffset + 1,
            generator: new FieldEntryGenerator(` ${scopeName} {\n`, `\n${indentation}}`, indentation + " ".repeat(4)),
            meta
        };
    }
}

/**
 * Extracts the indentation of the given line and returns it as a string.
 *
 * @param document the document from whicht to extract the line
 * @param line the line number
 * @returns the extracted indentation
 */
function extractIndentation(document: TextDocument, line: number): string {
    const lineText = document.getText(Range.create(line, 0, line, Number.MAX_VALUE));
    const match = lineText.match(/^\s*/);
    if (match == null) {
        return "";
    } else {
        return match[0];
    }
}
