import { AbstractFunctionExpression, Expression } from "@hylimo/core/src/ast/ast";
import { CompletionExpressionMetadata } from "@hylimo/core/src/ast/expressionMetadata";
import { ExecutableExpression } from "@hylimo/core/src/runtime/ast/executableExpression";
import { InterpreterContext } from "@hylimo/core/src/runtime/interpreter";
import { BaseObject } from "@hylimo/core/src/runtime/objects/baseObject";
import { AbstractFunctionObject } from "@hylimo/core/src/runtime/objects/functionObject";
import { CompletionError } from "./completionError";
import { CompletionItem, CompletionItemKind, MarkupContent, Position, TextEdit, Range } from "vscode-languageserver";

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

    evaluateInternal(context: InterpreterContext): never {
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
            let isFunction = false;
            const value = entry.value;
            if (value instanceof AbstractFunctionObject) {
                const functionExpression = value.definition.expression as AbstractFunctionExpression;
                docs = functionExpression.decorator.get("docs") ?? "";
                isFunction = true;
            }
            let kind: CompletionItemKind;
            if (this.context != undefined) {
                kind = isFunction ? CompletionItemKind.Method : CompletionItemKind.Field;
            } else {
                kind = isFunction ? CompletionItemKind.Function : CompletionItemKind.Variable;
            }
            const range = this.expression.metadata.identifierPosition!;
            items.push({
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
            });
        }
        return items;
    }

    /**
     * Preprocesses the documentation string to make it more readable in the editor
     *
     * @param documentation the syncscript documentation string, may be undefined
     * @returns the processed documentation string
     */
    private preprocessDocumentation(documentation: string | undefined): MarkupContent | undefined {
        if (documentation == undefined) {
            return undefined;
        }
        const lines = documentation.split("\n").filter((line) => line.trim() != "");
        const indentation = lines
            .map((line) => line.match(/^\s*/)?.[0]?.length ?? 0)
            .reduce((a, b) => Math.min(a, b), Number.MAX_SAFE_INTEGER);
        const unendentedLines = lines.map((line) => line.substring(indentation));
        const processedLines = unendentedLines
            .map((line) => {
                const whitespaceLength = line.match(/^\s*/)?.[0]?.length ?? 0;
                const half = Math.floor(whitespaceLength / 2);
                return line.substring(half);
            })
            .map((line) => {
                if (line.trim() == "Params:") {
                    return "\n**Params:**";
                } else if (line.trim() == "Returns:") {
                    return "\n**Returns:**\n";
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
