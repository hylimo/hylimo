import type { CompletionExpressionMetadata } from "./expressionMetadata.js";
import { Expression } from "./expression.js";
import type { InterpreterContext } from "../runtime/interpreter/interpreterContext.js";
import type { WrapperObject } from "../runtime/objects/wrapperObject.js";

/**
 * Identifier expression
 * Equivalent to a field access expression on the local scope
 */

export class IdentifierExpression extends Expression<CompletionExpressionMetadata> {
    static readonly TYPE = "IdentifierExpression";

    private static readonly WRAPPER_ENTRIES = new Map([
        ...Expression.expressionWrapperObjectEntries<IdentifierExpression>(IdentifierExpression.TYPE),
        ["identifier", (wrapped, context) => context.newString(wrapped.identifier)]
    ]);

    /**
     * Creates a new IdentifierExpression consisting of an identifier
     * @param identifier the name of the identifier
     * @param metadata metadata for the expression
     */
    constructor(
        readonly identifier: string,
        metadata: CompletionExpressionMetadata
    ) {
        super(IdentifierExpression.TYPE, metadata);
    }

    override toWrapperObject(context: InterpreterContext): WrapperObject<this> {
        return context.newWrapperObject(this, IdentifierExpression.WRAPPER_ENTRIES);
    }
}
