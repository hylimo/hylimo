import { CompletionExpressionMetadata, ParenthesisExpressionMetadata } from "./expressionMetadata.js";
import { Expression } from "./expression.js";
import { AbstractInvocationExpression } from "./abstractInvocationExpression.js";
import { ListEntry } from "./listEntry.js";
import { InterpreterContext } from "../runtime/interpreter/interpreterContext.js";
import { WrapperObject } from "../runtime/objects/wrapperObject.js";

/**
 * Function invocation which provides the self parameter automatically
 * Accesses the field name on target, invokes it and provides target as self
 */

export class SelfInvocationExpression extends AbstractInvocationExpression<
    CompletionExpressionMetadata & ParenthesisExpressionMetadata
> {
    static readonly TYPE = "SelfInvocationExpression";

    private static readonly WRAPPER_ENTRIES = new Map([
        ...Expression.expressionWrapperObjectEntries<SelfInvocationExpression>(SelfInvocationExpression.TYPE),
        [
            "name",
            (wrapped, context) => {
                if (typeof wrapped.name === "string") {
                    return context.newString(wrapped.name);
                } else {
                    return context.newNumber(wrapped.name);
                }
            }
        ],
        ["target", (wrapped, context) => wrapped.target.toWrapperObject(context)],
        [
            "arguments",
            (wrapped, context) => context.newListWrapperObject(wrapped.argumentExpressions, ListEntry.toWrapperObject)
        ]
    ]);

    /**
     * Creates a new InvocationExpression consisting of an expression of which the result should be invoked,
     * and a set of optionally named expressions as arguments
     *
     * @param target evaluated to provide the function to invoke
     * @param name the name or index to access on target
     * @param innerArgumentExpressions the inner argument expressions (inside the parentheses)
     * @param trailingArgumentExpressions the trailing argument expressions (functions after the parentheses)
     * @param metadata metadata for the expression
     */
    constructor(
        readonly name: string | number,
        readonly target: Expression,
        innerArgumentExpressions: ListEntry[],
        trailingArgumentExpressions: ListEntry[],
        metadata: CompletionExpressionMetadata & ParenthesisExpressionMetadata
    ) {
        super(innerArgumentExpressions, trailingArgumentExpressions, SelfInvocationExpression.TYPE, metadata);
    }

    protected override markNoEditInternal(): void {
        super.markNoEditInternal();
        this.target.markNoEdit();
        for (const argument of this.argumentExpressions) {
            argument.value.markNoEdit();
        }
    }

    override toWrapperObject(context: InterpreterContext): WrapperObject<this> {
        return context.newWrapperObject(this, SelfInvocationExpression.WRAPPER_ENTRIES);
    }
}
