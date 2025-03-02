import type { AbstractInvocationExpression } from "../../ast/abstractInvocationExpression.js";
import type { Expression } from "../../ast/expression.js";
import type { ExpressionMetadata } from "../../ast/expressionMetadata.js";
import type { InterpreterContext } from "../interpreter/interpreterContext.js";
import type { BaseObject } from "./baseObject.js";
import type { WrapperObject, WrapperObjectFieldRetriever } from "./wrapperObject.js";

/**
 * Entry of a field
 */
export interface LabeledValue {
    /**
     * The value of the field
     */
    value: BaseObject;
    /**
     * The source of the field
     * If available: either the expression which evaluated to this value,
     * or a MissingArgumentSource if the value originated from a missing argument
     */
    source?: Expression | MissingArgumentSource;
}

/**
 * A source that represents a missing argument (which thus evaluated to null)
 */
export class MissingArgumentSource {
    static readonly TYPE = "MissingArgument";

    private static readonly WRAPPER_ENTRIES = new Map<
        string | number,
        WrapperObjectFieldRetriever<MissingArgumentSource>
    >([
        ["type", (_wrapped, context) => context.newString(MissingArgumentSource.TYPE)],
        ["expression", (wrapped, context) => wrapped.expression.toWrapperObject(context)],
        [
            "key",
            (wrapped, context) => {
                if (typeof wrapped.key === "string") {
                    return context.newString(wrapped.key);
                } else {
                    return context.newNumber(wrapped.key);
                }
            }
        ]
    ]);

    /**
     * Creates a new MissingArgumentSource
     *
     * @param expression the invocation where the argument is missing
     * @param key the key of the missing argument
     */
    constructor(
        readonly expression: AbstractInvocationExpression,
        readonly key: string | number
    ) {}

    /**
     * Getter for the metadata from the expression
     */
    get metadata(): ExpressionMetadata {
        return this.expression.metadata;
    }

    /**
     * Converts this MissingArgumentSource to a wrapper object
     *
     * @param context the interpreter context
     * @returns the wrapper object representing the MissingArgumentSource
     */
    toWrapperObject(context: InterpreterContext): WrapperObject<this> {
        return context.newWrapperObject(this, MissingArgumentSource.WRAPPER_ENTRIES);
    }
}
