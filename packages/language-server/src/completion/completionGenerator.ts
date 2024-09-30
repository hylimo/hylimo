import {
    AbstractFunctionObject,
    AbstractInvocationExpression,
    BaseObject,
    ExecutableAbstractFunctionExpression,
    ExecutableConstExpression,
    ExecutableListEntry,
    InterpreterContext,
    LabeledValue,
    SemanticFieldNames
} from "@hylimo/core";
import { CompletionError } from "./completionError.js";
import { CompletionItem } from "./completionItem.js";
import { FullObject } from "@hylimo/core/lib/runtime/objects/fullObject.js";
import { CompletionItemKind, InsertTextFormat, InsertTextMode, MarkupKind } from "vscode-languageserver";
import { Range } from "@hylimo/core";

/**
 * If the given func throws an error during execution, the LSP tries to autocomplete the named parameters of this function
 *
 * @param func the function to be called
 * @param target where the function is being called on (i.e. `THIS.hi()`
 * @param context the current context
 * @param args the arguments of this function
 * @param expression the executed invocation expression
 */
export function supplyNamedArguments(
    func: BaseObject,
    target: LabeledValue,
    context: InterpreterContext,
    args: ExecutableListEntry[],
    expression: AbstractInvocationExpression
): LabeledValue {
    try {
        return func.invoke(
            [{ value: new ExecutableConstExpression(target), name: SemanticFieldNames.SELF }, ...args],
            context,
            undefined,
            expression
        );
    } catch (error: any) {
        if (CompletionError.isCompletionError(error) && func instanceof AbstractFunctionObject) {
            error.completionItems.push(...getNamedArgs(func, context, error));
        }

        throw error;
    }
}

/**
 * Computes completion items for the documented named arguments of the currently executed function.
 *
 * @param func the currently interpreted function
 * @param context the current context
 * @param error the error that was thrown beforehand
 * @return the completion items generated from the documented named arguments of this function
 */
function getNamedArgs(
    func: AbstractFunctionObject<ExecutableAbstractFunctionExpression<any>>,
    context: InterpreterContext,
    error: CompletionError
): CompletionItem[] {
    if (!(func.docs instanceof FullObject)) {
        return [];
    }

    const params = func.docs.getFieldValue("params", context);
    if (!(params instanceof FullObject)) {
        return [];
    }

    return [...params.fields.entries()]
        .filter(([key, entry]) => key !== SemanticFieldNames.PROTO && !entry.value.isNull)
        .filter(([key, _]) => typeof key === "string")
        .map(([param, description]) =>
            createNamedArgCompletionItem(param, description.value.toString(context), error.completionRange)
        );
}

/**
 * Creates a completion item for a named argument.<br>
 * Due to the way the autocompletion works, we need to replace the whole function until this point with the given text:<br>
 * For example, for `class("Hello", abst` we must replace the whole block with `class("Hello", abstract = `
 *
 * @param arg the full function parameter to autocomplete
 * @param argDocs the documentation of this parameter
 * @param range the range of the parameter to replace
 * @returns the completion item
 */
function createNamedArgCompletionItem(arg: string | number, argDocs: string, range: Range): CompletionItem {
    const text = `${arg} = `;
    return {
        label: arg.toString(),
        detail: arg.toString(),
        documentation: {
            kind: MarkupKind.Markdown,
            value: argDocs
        },
        textEdit: {
            range,
            text: text
        },
        kind: CompletionItemKind.Variable,
        insertTextFormat: InsertTextFormat.PlainText,
        insertTextMode: InsertTextMode.asIs
    };
}
