import { ASTExpressionPosition, Expression, FullObject, SemanticFieldNames } from "@hylimo/core";
import { CompletionExpressionMetadata } from "@hylimo/core";
import { ExecutableExpression } from "@hylimo/core";
import { InterpreterContext } from "@hylimo/core";
import { BaseObject } from "@hylimo/core";
import { AbstractFunctionObject } from "@hylimo/core";
import { CompletionError } from "./completionError.js";
import {
    CompletionItem,
    CompletionItemKind,
    Position,
    TextEdit,
    Range,
    InsertTextFormat,
    InsertTextMode,
    MarkupKind
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
            throw new CompletionError(this.transformCompletionContext(completionContext.value, context));
        } else {
            throw new CompletionError(this.transformCompletionContext(context.currentScope, context));
        }
    }

    /**
     * Transforms the given context into completion items
     *
     * @param value the context to transform
     * @param expression the expression where to complete
     * @returns the generated completion items
     */
    private transformCompletionContext(value: BaseObject, context: InterpreterContext): CompletionItem[] {
        const items: CompletionItem[] = [];
        for (const [key, entry] of Object.entries(value.getFieldEntries())) {
            const value = entry.value;
            const docs = this.getDocsDescription(value, context) ?? this.getFieldDescription(value, context, key) ?? "";
            const snippet: string | undefined = this.getDocSnippet(value, context);
            const isFunction = value instanceof AbstractFunctionObject;
            let kind: CompletionItemKind;
            if (this.context != undefined) {
                kind = isFunction ? CompletionItemKind.Method : CompletionItemKind.Field;
            } else {
                kind = isFunction ? CompletionItemKind.Function : CompletionItemKind.Variable;
            }
            const range = this.expression!.metadata.identifierPosition;
            items.push(this.createCompletionItem(key, docs, range, kind));
            if (snippet != undefined) {
                items.push(this.createSnippetCompletionItem(key, docs, snippet, range));
            }
        }
        return items;
    }

    /**
     * Gets the docs object from the given value
     *
     * @param value the value to get the docs from
     * @param context context requried for accessing fields
     * @returns the docs object or undefined if not found
     */
    private getDocs(value: BaseObject, context: InterpreterContext): FullObject | undefined {
        if (value.isNull) {
            return undefined;
        }
        const docs = value.getField(SemanticFieldNames.DOCS, context);
        if (docs instanceof FullObject) {
            return docs;
        } else {
            return undefined;
        }
    }

    /**
     * Gets the docs string from the given value
     *
     * @param value the value to get the docs from
     * @param context context requried for accessing fields
     * @returns the docs string or undefined if not found
     */
    private getDocsDescription(value: BaseObject, context: InterpreterContext): string | undefined {
        const docs = this.getDocs(value, context);
        if (docs == undefined) {
            return undefined;
        }
        const description = docs.getField("docs", context);
        return (
            description.toString() +
            "\n\n" +
            ["Fields", "Params", "Returns", "Snippet"]
                .map((field) => [field, this.getDocField(docs, field.toLowerCase(), context)])
                .filter(([, value]) => value != undefined)
                .map(([field, value]) => `**${field}:**\n${value}`)
                .join("\n\n")
        );
    }

    /**
     * Gets the snippet from the given value
     *
     * @param value the value to get the snippet from
     * @param context context requried for accessing fields
     * @returns the snippet or undefined if not found
     */
    private getDocSnippet(value: BaseObject, context: InterpreterContext): string | undefined {
        const docs = this.getDocs(value, context);
        if (docs == undefined) {
            return undefined;
        }
        const snippet = docs.getField("snippet", context);
        if (snippet.isNull) {
            return undefined;
        }
        return snippet.toString();
    }

    /**
     * Gets the field description string for field from the docs
     *
     * @param value the value to get the field description from
     * @param context context requried for accessing fields
     * @param field the name of the field to get the description of
     * @returns the field description or undefined if not found
     */
    private getFieldDescription(value: BaseObject, context: InterpreterContext, field: string | number) {
        const docs = this.getDocs(value, context);
        if (docs == undefined) {
            return undefined;
        }
        const fields = docs.getField("fields", context);
        if (!(fields instanceof FullObject)) {
            return undefined;
        }
        const fieldDocs = fields.getField(field, context);
        if (fieldDocs.isNull) {
            return undefined;
        }
        return fieldDocs.toString();
    }

    /**
     * Gets a field of the docs object as string
     * If the object is an object, the fields are listed
     *
     * @param docs the docs object
     * @param field the field to get
     * @param context context requried for accessing fields
     * @returns the field as string or undefined if not found
     */
    private getDocField(docs: FullObject, field: string, context: InterpreterContext): string | undefined {
        const docField = docs.getField(field, context);
        if (docField.isNull) {
            return undefined;
        }
        if (docField instanceof FullObject) {
            return [...docField.fields.entries()]
                .filter(([key, entry]) => key !== SemanticFieldNames.PROTO && !entry.value.isNull)
                .map(([key, entry]) => `- ${key}: ${entry.value.toString()}`)
                .join("\n");
        } else {
            return docField.toString();
        }
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
            documentation: {
                kind: MarkupKind.Markdown,
                value: docs
            },
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
            documentation: {
                kind: MarkupKind.Markdown,
                value: docs
            },
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
}
