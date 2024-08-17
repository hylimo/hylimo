import { InterpreterContext } from "../runtime/interpreter/interpreterContext.js";
import { WrapperObject, WrapperObjectFieldRetriever } from "../runtime/objects/wrapperObject.js";
import { Expression } from "./expression.js";

/**
 * A list entry either for function invokation or object expression
 */
export interface ListEntry {
    /**
     * The optional name of the argument
     */
    name?: string;
    /**
     * Evaluated to be the value of the argument
     */
    value: Expression;
}

export namespace ListEntry {
    const WRAPPER_ENTRIES = new Map<string, WrapperObjectFieldRetriever<ListEntry>>([
        ["name", (wrapped, context) => (wrapped.name ? context.newString(wrapped.name) : context.null)],
        ["value", (wrapped, context) => wrapped.value.toWrapperObject(context)]
    ]);

    /**
     * Converts a list entry to a wrapper object
     *
     * @param listEntry the list entry to convert
     * @param context the interpreter context
     * @returns the wrapped list entry
     */
    export function toWrapperObject(listEntry: ListEntry, context: InterpreterContext): WrapperObject<ListEntry> {
        return context.newWrapperObject(listEntry, WRAPPER_ENTRIES);
    }
}
