import { ParenthesisExpressionMetadata } from "./expressionMetadata.js";
import { Expression } from "./expression.js";
import { AbstractInvocationExpression } from "./abstractInvocationExpression.js";
import { ListEntry } from "./listEntry.js";
import { InterpreterContext } from "../runtime/interpreter/interpreterContext.js";
import { WrapperObject } from "../runtime/objects/wrapperObject.js";

/*
 * Function invocation expression
 * Evaluates to the result of the called function
 */
export class InvocationExpression extends AbstractInvocationExpression {
    static readonly TYPE = "InvocationExpression";

    private static readonly WRAPPER_ENTRIES = new Map([
        ...Expression.expressionWrapperObjectEntries<InvocationExpression>(InvocationExpression.TYPE),
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
     * @param innerArgumentExpressions the inner argument expressions (inside the parentheses)
     * @param trailingArgumentExpressions the trailing argument expressions (functions after the parentheses)
     * @param metadata metadata for the expression
     */
    constructor(
        readonly target: Expression,
        innerArgumentExpressions: ListEntry[],
        trailingArgumentExpressions: ListEntry[],
        metadata: ParenthesisExpressionMetadata
    ) {
        super(innerArgumentExpressions, trailingArgumentExpressions, InvocationExpression.TYPE, metadata);
    }

    protected override markNoEditInternal(): void {
        super.markNoEditInternal();
        this.target.markNoEdit();
        for (const argument of this.argumentExpressions) {
            argument.value.markNoEdit();
        }
    }

    override toWrapperObject(context: InterpreterContext): WrapperObject<this> {
        return context.newWrapperObject(this, InvocationExpression.WRAPPER_ENTRIES);
    }
}
