import type { ParenthesisExpressionMetadata } from "./expressionMetadata.js";
import { Expression } from "./expression.js";
import { ListEntry } from "./listEntry.js";
import type { WrapperObjectFieldRetriever } from "../runtime/objects/wrapperObject.js";

/**
 * Base class for all invocation expressions, provides helper to generate args
 */
export abstract class AbstractInvocationExpression<
    M extends ParenthesisExpressionMetadata = ParenthesisExpressionMetadata
> extends Expression<M> {
    /**
     * all argument expressions
     */
    readonly argumentExpressions: ListEntry[];

    /**
     * Creates the common entries for subclass wrapper objects
     *
     * @param type the type of the subclass
     * @returns the common entries for the subclass wrapper object
     */
    static invocationExpressionWrapperObjectEntries<T extends AbstractInvocationExpression>(
        type: string
    ): [string | number, WrapperObjectFieldRetriever<T>][] {
        return [
            ...Expression.expressionWrapperObjectEntries<T>(type),
            ["target", (wrapped, context) => wrapped.target.toWrapperObject(context)],
            [
                "arguments",
                (wrapped, context) =>
                    context.newListWrapperObject(wrapped.argumentExpressions, ListEntry.toWrapperObject)
            ]
        ];
    }

    /**
     * Base constructor for all AbstractInvocationExpressions
     *
     * @param target the target either to invoke or to access (depends on the subclass)
     * @param innerArgumentExpressions the inner argument expressions (inside the parentheses)
     * @param trailingArgumentExpressions the trailing argument expressions (functions after the parentheses)
     * @param metadata metadata for the expression
     * @param type used for serialization and debugging
     */
    constructor(
        readonly target: Expression,
        readonly innerArgumentExpressions: ListEntry[],
        readonly trailingArgumentExpressions: ListEntry[],
        type: string,
        metadata: M
    ) {
        super(type, metadata);
        this.argumentExpressions = [...innerArgumentExpressions, ...trailingArgumentExpressions];
    }

    protected override markNoEditInternal(): void {
        super.markNoEditInternal();
        this.target.markNoEdit();
        for (const arg of this.argumentExpressions) {
            arg.value.markNoEdit();
        }
    }
}
