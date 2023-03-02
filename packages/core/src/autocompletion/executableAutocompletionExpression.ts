import { AbstractFunctionExpression, Expression } from "../ast/ast";
import { AutocompletionExpressionMetadata } from "../ast/expressionMetadata";
import { ExecutableExpression } from "../runtime/ast/executableExpression";
import { InterpreterContext } from "../runtime/interpreter";
import { BaseObject } from "../runtime/objects/baseObject";
import { AbstractFunctionObject } from "../runtime/objects/functionObject";
import { AutocompletionError } from "./autocompletionError";
import { AutocompletionItem, AutocompletionItemKind } from "./autocompletionItem";

/**
 * An expression which throws an AutocompletionError on evaluation
 */
export class ExecutableAutocompletionExpression extends ExecutableExpression<
    Expression<AutocompletionExpressionMetadata>
> {
    /**
     * Creates a new ExecutableAutocompletionExpression
     *
     * @param expression the expression this represents
     * @param context evaluated and thrown as AutocompletionError, if undefined, the current scope is used
     */
    constructor(
        expression: Expression<AutocompletionExpressionMetadata>,
        readonly context?: ExecutableExpression<any>
    ) {
        super(expression);
    }

    evaluateInternal(context: InterpreterContext): never {
        if (this.context != undefined) {
            const autocompletionContext = this.context.evaluate(context);
            throw new AutocompletionError(this.transformAutocompletionContext(autocompletionContext.value));
        } else {
            throw new AutocompletionError(this.transformAutocompletionContext(context.currentScope));
        }
    }

    /**
     * Transforms the given context into autocompletion items
     *
     * @param context the context to transform
     * @param expression the expression where to autocomplete
     * @returns the generated autocompletion items
     */
    private transformAutocompletionContext(context: BaseObject): AutocompletionItem[] {
        const items: AutocompletionItem[] = [];
        for (const [key, entry] of Object.entries(context.getFieldEntries())) {
            let docs = "";
            let isFunction = false;
            const value = entry.value;
            if (value instanceof AbstractFunctionObject) {
                const functionExpression = value.definition.expression as AbstractFunctionExpression;
                docs = functionExpression.decorator.get("docs") ?? "";
                isFunction = true;
            }
            let kind: AutocompletionItemKind;
            if (this.context != undefined) {
                kind = isFunction ? AutocompletionItemKind.METHOD : AutocompletionItemKind.FIELD;
            } else {
                kind = isFunction ? AutocompletionItemKind.FUNCTION : AutocompletionItemKind.VARIABLE;
            }
            items.push({
                label: key,
                value: key,
                documentation: docs,
                replaceRange: this.expression.metadata.identifierPosition!,
                kind
            });
        }
        return items;
    }
}
