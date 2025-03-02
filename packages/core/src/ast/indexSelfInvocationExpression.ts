import type { ParenthesisExpressionMetadata } from "./expressionMetadata.js";
import type { Expression } from "./expression.js";
import { AbstractInvocationExpression } from "./abstractInvocationExpression.js";
import type { ListEntry } from "./listEntry.js";
import type { InterpreterContext } from "../runtime/interpreter/interpreterContext.js";
import type { WrapperObject } from "../runtime/objects/wrapperObject.js";

/**
 * Function invocation which provides the self parameter automatically
 * Accesses the field provided by index on target, invokes it and provides target as self
 */

export class IndexSelfInvocationExpression extends AbstractInvocationExpression<ParenthesisExpressionMetadata> {
    static readonly TYPE = "IndexSelfInvocationExpression";

    private static readonly WRAPPER_ENTRIES = new Map([
        ...AbstractInvocationExpression.invocationExpressionWrapperObjectEntries<IndexSelfInvocationExpression>(
            IndexSelfInvocationExpression.TYPE
        ),
        ["index", (wrapped, context) => wrapped.index.toWrapperObject(context)]
    ]);

    /**
     * Creates a new InvocationExpression consisting of an expression of which the result should be invoked,
     * and a set of optionally named expressions as arguments
     *
     * @param index evaluated to provide the index to access on target
     * @param target evaluated to provide the function to invoke
     * @param innerArgumentExpressions the inner argument expressions (inside the parentheses)
     * @param trailingArgumentExpressions the trailing argument expressions (functions after the parentheses)
     * @param metadata metadata for the expression
     */
    constructor(
        readonly index: Expression,
        target: Expression,
        innerArgumentExpressions: ListEntry[],
        trailingArgumentExpressions: ListEntry[],
        metadata: ParenthesisExpressionMetadata
    ) {
        super(
            target,
            innerArgumentExpressions,
            trailingArgumentExpressions,
            IndexSelfInvocationExpression.TYPE,
            metadata
        );
    }

    protected override markNoEditInternal(): void {
        super.markNoEditInternal();
        this.index.markNoEdit();
    }

    override toWrapperObject(context: InterpreterContext): WrapperObject<this> {
        return context.newWrapperObject(this, IndexSelfInvocationExpression.WRAPPER_ENTRIES);
    }
}
