import { ASTExpressionPosition, Expression } from "@hylimo/core";
import { CompletionExpressionMetadata } from "@hylimo/core";
import { ExecutableExpression } from "@hylimo/core";
import { InterpreterContext } from "@hylimo/core";
import { BaseObject } from "@hylimo/core";
import { AbstractFunctionObject } from "@hylimo/core";
import { CompletionError } from "./completionError";
import {
    CompletionItem,
    CompletionItemKind,
    MarkupContent,
    Position,
    TextEdit,
    Range,
    InsertTextFormat,
    InsertTextMode
} from "vscode-languageserver";

/**
 * An expression which throws an CompletionError on evaluation
 */
export class ExecutableCompletionExpression extends ExecutableExpression<Expression<CompletionExpressionMetadata>> {
    /**
     * Creates a new ExecutableCompletionExpression
     *
     * @param expression the expression this represents
     * @param context evaluated and thrown as CompletionError, if undefined, the current scope is used
     */
    constructor(expression: Expression<CompletionExpressionMetadata>, readonly context?: ExecutableExpression<any>) {
        super(expression);
    }

    override evaluateInternal(context: InterpreterContext): never {
        if (this.context != undefined) {
            const completionContext = this.context.evaluate(context);
            throw new CompletionError(this.transformCompletionContext(completionContext.value));
        } else {
            throw new CompletionError(this.transformCompletionContext(context.currentScope));
        }
    }

    /**
     * Transforms the given context into completion items
     *
     * @param context the context to transform
     * @param expression the expression where to complete
     * @returns the generated completion items
     */
    private transformCompletionContext(context: BaseObject): CompletionItem[] {
        const items: CompletionItem[] = [];
        for (const [key, entry] of Object.entries(context.getFieldEntries())) {
            let docs = "";
            let snippet: string | undefined = undefined;
            let isFunction = false;
            const value = entry.value;
            if (value instanceof AbstractFunctionObject) {
                const decorator = value.definition.decorator;
                docs = decorator.get("docs") ?? "";
                snippet = decorator.get("snippet");
                isFunction = true;
            }
            let kind: CompletionItemKind;
            if (this.context != undefined) {
                kind = isFunction ? CompletionItemKind.Method : CompletionItemKind.Field;
            } else {
                kind = isFunction ? CompletionItemKind.Function : CompletionItemKind.Variable;
            }
            const range = this.expression!.metadata.identifierPosition!;
            items.push(this.createCompletionItem(key, docs, range, kind));
            if (snippet != undefined) {
                items.push(this.createSnippetCompletionItem(key, docs, snippet, range));
            }
        }
        return items;
    }

    /**
     * Creates a non-snippet completion item for an identifier
     *
     * @param key the identifier to insert
     * @param docs documentation of the identifier, only present if the identifier represents a function
     * @param range the range to replace
     * @param kind the kind of the completion item
     * @returns the completion item
     */
    private createCompletionItem(
        key: string,
        docs: string,
        range: ASTExpressionPosition,
        kind: CompletionItemKind
    ): CompletionItem {
        return {
            label: key,
            detail: key,
            documentation: this.preprocessDocumentation(docs),
            textEdit: TextEdit.replace(
                Range.create(
                    Position.create(range.startLine, range.startColumn),
                    Position.create(range.endLine, range.endColumn)
                ),
                key
            ),
            kind
        };
    }

    /**
     * Creates a completion item for a snippet
     *
     * @param key the identifier at the start of the snippet
     * @param docs documentation of the function of the identifier
     * @param snippet the snippet code to insert, without the identifier
     * @param range the range to replace
     * @returns the completion item
     */
    private createSnippetCompletionItem(
        key: string,
        docs: string,
        snippet: string,
        range: ASTExpressionPosition
    ): CompletionItem {
        const snippetCode = key + snippet;
        return {
            label: key,
            detail: key,
            documentation: this.preprocessDocumentation(docs, `\n\n**Snippet:**\n \`\`\`\n${snippetCode}\n\`\`\``),
            textEdit: TextEdit.replace(
                Range.create(
                    Position.create(range.startLine, range.startColumn),
                    Position.create(range.endLine, range.endColumn)
                ),
                snippetCode
            ),
            kind: CompletionItemKind.Snippet,
            insertTextFormat: InsertTextFormat.Snippet,
            insertTextMode: InsertTextMode.adjustIndentation
        };
    }

    /**
     * Preprocesses the documentation string to make it more readable in the editor
     *
     * @param documentation the syncscript documentation string, may be undefined
     * @param additionalDocumentation documentation with is appended and assumed to have no indentation
     * @returns the processed documentation string
     */
    private preprocessDocumentation(
        documentation: string | undefined,
        additionalDocumentation?: string
    ): MarkupContent | undefined {
        if (documentation == undefined) {
            return undefined;
        }
        const lines = documentation.split("\n").filter((line) => line.trim() != "");
        const indentation = lines
            .map((line) => line.match(/^\s*/)?.[0]?.length ?? 0)
            .reduce((a, b) => Math.min(a, b), Number.MAX_SAFE_INTEGER);
        const unendentedLines = lines.map((line) => line.substring(indentation));
        const processedLines = [...unendentedLines, ...(additionalDocumentation ?? "").split("\n")]
            .map((line) => {
                const whitespaceLength = line.match(/^\s*/)?.[0]?.length ?? 0;
                const half = Math.floor(whitespaceLength / 2);
                return line.substring(half);
            })
            .map((line) => {
                if (/[a-z]+:/i.test(line.trim())) {
                    return `\n**${line.trim()}**\n`;
                } else {
                    return line;
                }
            });
        const processed = processedLines.join("\n");
        return {
            kind: "markdown",
            value: processed
        };
    }
}
