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

export class FieldSelfInvocationExpression extends AbstractInvocationExpression<
    CompletionExpressionMetadata & ParenthesisExpressionMetadata
> {
    static readonly TYPE = "FieldSelfInvocationExpression";

    private static readonly WRAPPER_ENTRIES = new Map([
        ...AbstractInvocationExpression.invocationExpressionWrapperObjectEntries<FieldSelfInvocationExpression>(
            FieldSelfInvocationExpression.TYPE
        ),
        [
            "name",
            (wrapped, context) => {
                if (typeof wrapped.name === "string") {
                    return context.newString(wrapped.name);
                } else {
                    return context.newNumber(wrapped.name);
                }
            }
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
        target: Expression,
        innerArgumentExpressions: ListEntry[],
        trailingArgumentExpressions: ListEntry[],
        metadata: CompletionExpressionMetadata & ParenthesisExpressionMetadata
    ) {
        super(
            target,
            innerArgumentExpressions,
            trailingArgumentExpressions,
            FieldSelfInvocationExpression.TYPE,
            metadata
        );
    }

    override toWrapperObject(context: InterpreterContext): WrapperObject<this> {
        return context.newWrapperObject(this, FieldSelfInvocationExpression.WRAPPER_ENTRIES);
    }
}
