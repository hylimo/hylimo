import { ASTExpressionPosition, FullObject, FunctionExpression } from "@hylimo/core";
import { Position, Range, uinteger } from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { FieldEntryGenerator } from "../generators/fieldEntryGenerator";
import { EditGeneratorEntry } from "./editGeneratorEntry";

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
        return generateAddFieldToScope(scope, document, meta);
    } else {
        return generateCreateNewScope(element, scopeName, document, meta);
    }
}

/**
 * Creates an EditGeneratorEntry to add fields to an already existing function scope.
 * Handles all possible cases how the function block is structured and tries to preserve formatting in common cases.
 *
 * @param scope the function scope where to add the fields
 * @param document the document in which the function scope is located
 * @param meta metadata to add to the generated entry
 * @returns the generated entry
 */
function generateAddFieldToScope(scope: FunctionExpression, document: TextDocument, meta: any): EditGeneratorEntry {
    const position = scope.position!;
    if (position.startLine == position.endLine) {
        return generateAddFieldToScopeReplaceInner(position, document, meta);
    } else {
        return generateAddFieldToScopeInsertAtFirstLine(position, document, meta);
    }
}

/**
 * Creates an EditGeneratorEntry to add fields to a scope by creating a new scope with the given name and inserting the fields there.
 *
 * @param element the element where to add the fields
 * @param scopeName the name of the scope where to add the fields
 * @param document the document in which the element is located
 * @param meta metadata to add to the generated entry
 * @returns the generated entry
 */
function generateCreateNewScope(
    element: FullObject,
    scopeName: string,
    document: TextDocument,
    meta: any
): EditGeneratorEntry {
    const source = element.getLocalFieldOrUndefined("source")?.source;
    if (source == undefined) {
        throw new Error("element must have a source");
    }
    const indentation = extractIndentation(document, source.position!.startLine - 1);
    return {
        start: source.position!.endOffset + 1,
        end: source.position!.endOffset + 1,
        generator: FieldEntryGenerator.create(
            ` ${scopeName} {\n`,
            `\n${indentation}}`,
            increaseIndentation(indentation)
        ),
        meta
    };
}

/**
 * Creates an EditGeneratorEntry to add fields to a scope by replacing the inner text of the function block
 * and moving it to the next line.
 *
 * @param position the start position of the function block
 * @param document the document in which the function block is located
 * @param meta metadata to add to the generated entry
 * @returns the generated entry
 */
function generateAddFieldToScopeReplaceInner(
    position: ASTExpressionPosition,
    document: TextDocument,
    meta: any
): EditGeneratorEntry {
    const innerText = document.getText(
        Range.create(document.positionAt(position.startOffset + 1), document.positionAt(position.endOffset))
    );
    const innerTextWithoutWhitespace = innerText.replace(/^\s*/, "");
    const indentation = extractIndentation(document, position.startLine - 1);
    const innerIndentation = increaseIndentation(indentation);
    let prefix: string;
    if (innerTextWithoutWhitespace == "") {
        prefix = "\n";
    } else {
        prefix = `\n${innerIndentation}${innerTextWithoutWhitespace}\n`;
    }
    return {
        start: position.startOffset + 1,
        end: position.endOffset,
        generator: FieldEntryGenerator.create(prefix, `\n${indentation}`, innerIndentation),
        meta
    };
}

/**
 * Creates an EditGeneratorEntry to add fields to a scope by inserting the fields at the first line of the function block.
 *
 * @param position the start position of the function block
 * @param document the document in which the function block is located
 * @param meta metadata to add to the generated entry
 * @returns the generated entry
 */
function generateAddFieldToScopeInsertAtFirstLine(
    position: ASTExpressionPosition,
    document: TextDocument,
    meta: any
): EditGeneratorEntry {
    const indentation = extractIndentation(document, position.startLine - 1);
    const innerIndentation = increaseIndentation(indentation);
    const lineEnd = document.getText(
        Range.create(
            document.positionAt(position.startOffset + 1),
            Position.create(position.startLine - 1, uinteger.MAX_VALUE)
        )
    );
    const lineEndContainsOnlyWhitespace = lineEnd.match(/^\s*$/);
    const suffix = lineEndContainsOnlyWhitespace ? "" : `\n${innerIndentation}`;
    return {
        start: position.startOffset + 1,
        end: position.startOffset + 1,
        generator: FieldEntryGenerator.create("\n", suffix, innerIndentation),
        meta
    };
}

/**
 * Increases the indentation of the given string by 4 spaces.
 *
 * @param indentation the existing indentation
 * @returns the new indentation string
 */
function increaseIndentation(indentation: string): string {
    return indentation + " ".repeat(4);
}

/**
 * Extracts the indentation of the given line and returns it as a string.
 *
 * @param document the document from whicht to extract the line
 * @param line the line number
 * @returns the extracted indentation
 */
function extractIndentation(document: TextDocument, line: number): string {
    const lineText = document.getText(Range.create(line, 0, line, uinteger.MAX_VALUE));
    const match = lineText.match(/^\s*/);
    if (match == null) {
        return "";
    } else {
        return match[0];
    }
}
