import {
    AbstractFunctionObject,
    BaseObject,
    CompletionExpressionMetadata,
    ExecutableExpression,
    Expression,
    FullObject,
    InterpreterContext,
    Range,
    SemanticFieldNames
} from "@hylimo/core";
import { CompletionError } from "./completionError.js";
import { CompletionItemKind, InsertTextFormat, InsertTextMode, MarkupKind } from "vscode-languageserver";
import { CompletionItem } from "./completionItem.js";

/**
 * Pattern for identifiers which can be used directly without indexing
 */
const identifierPattern = /^((([!#%&'+\-:;<=>?@\\^`|~_$]|\*(?!\/)|\/(?![/*])|\.{2,})+)|([a-z_$][a-z0-9_$]*))$/i;

/**
 * An expression which throws an CompletionError on evaluation
 */
export class ExecutableCompletionExpression extends ExecutableExpression<Expression<CompletionExpressionMetadata>> {
    /**
     * Creates a new ExecutableCompletionExpression
     *
     * @param expression the expression this represents
     * @param isAccess whether this is an access completion (can index be used directly)
     * @param context evaluated and thrown as CompletionError, if undefined, the current scope is used
     */
    constructor(
        expression: Expression<CompletionExpressionMetadata>,
        readonly isAccess: boolean,
        readonly context?: ExecutableExpression<any>
    ) {
        super(expression);
    }

    override evaluateInternal(context: InterpreterContext): never {
        if (this.context != undefined) {
            const completionContext = this.context.evaluate(context);
            throw new CompletionError(
                this.transformCompletionContext(completionContext.value, context),
                this.expression!.metadata.completionRange
            );
        } else {
            throw new CompletionError(
                this.transformCompletionContext(context.currentScope, context),
                this.expression!.metadata.completionRange
            );
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
        for (const [key, entry] of value.getFields(context)) {
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
            const range = this.expression!.metadata.completionRange;
            items.push(this.createIdentifierCompletionItem(key, docs, range, kind));
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
        const docs = value.getFieldValue(SemanticFieldNames.DOCS, context);
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
        const description = docs.getFieldValue("docs", context);
        return (
            description.toString(context) +
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
        const snippet = docs.getFieldValue("snippet", context);
        if (snippet.isNull) {
            return undefined;
        }
        return snippet.toString(context);
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
        const fieldDocs = fields.getFieldValue(field, context);
        if (fieldDocs.isNull) {
            return undefined;
        }
        return fieldDocs.toString(context);
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
        const docField = docs.getFieldValue(field, context);
        if (docField.isNull) {
            return undefined;
        }
        if (docField instanceof FullObject) {
            return [...docField.fields.entries()]
                .filter(([key, entry]) => key !== SemanticFieldNames.PROTO && !entry.value.isNull)
                .map(([key, entry]) => `- ${key}: ${entry.value.toString(context)}`)
                .join("\n");
        } else {
            return docField.toString(context);
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
    private createIdentifierCompletionItem(
        key: string | number,
        docs: string,
        range: Range,
        kind: CompletionItemKind
    ): CompletionItem {
        const requiresIndex = typeof key === "number" || !identifierPattern.test(key);
        let text: string;
        if (this.isAccess) {
            text = requiresIndex ? `[${this.keyToString(key)}]` : `.${key}`;
        } else {
            text = requiresIndex ? `this[${this.keyToString(key)}]` : key;
        }
        return {
            label: key.toString(),
            detail: key.toString(),
            filterText: this.computeFilterText(key),
            documentation: {
                kind: MarkupKind.Markdown,
                value: docs
            },
            textEdit: {
                range,
                text
            },
            kind
        };
    }

    /**
     * Converts a key to a string
     * If the key is a number, it is converted to a string directly.
     * Otherwise, it is put in quotes and non-ASCII characters are escaped.
     *
     * @param key the key to convert
     * @returns the key as a string
     */
    private keyToString(key: string | number): string {
        if (typeof key === "number") {
            return key.toString();
        }

        const allowedPattern = /^[a-zA-Z0-9!#$%&'()*+,\-./:;<=>?@[\]^_`{|}~ ]$/;
        const escapedKey = [...key]
            .map((char) => {
                if (allowedPattern.test(char)) {
                    return char;
                } else if (char === "\n") {
                    return "\\n";
                } else if (char === "\t") {
                    return "\\t";
                } else if (char === '"') {
                    return '\\"';
                } else {
                    const code = char.charCodeAt(0);
                    return "\\u" + code.toString(16).padStart(4, "0");
                }
            })
            .join("");

        return `"${escapedKey}"`;
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
        key: string | number,
        docs: string,
        snippet: string,
        range: Range
    ): CompletionItem {
        const snippetCode = key + snippet;
        return {
            label: key.toString(),
            detail: key.toString(),
            filterText: this.computeFilterText(key),
            documentation: {
                kind: MarkupKind.Markdown,
                value: docs
            },
            textEdit: {
                range,
                text: snippetCode
            },
            kind: CompletionItemKind.Snippet,
            insertTextFormat: InsertTextFormat.Snippet,
            insertTextMode: InsertTextMode.adjustIndentation
        };
    }

    /**
     * Computes the filter text for a completion item
     * Currently simply prepends a dot to the key (necessary for field access as the dot is replaced)
     *
     * @param key the key of the completion item
     * @returns the filter text
     */
    private computeFilterText(key: string | number): string {
        return `.${key}`;
    }
}
