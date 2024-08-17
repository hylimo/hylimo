import { InterpreterContext } from "../runtime/interpreter/interpreterContext.js";
import { WrapperObject } from "../runtime/objects/wrapperObject.js";
import { Expression } from "./expression.js";
import { ExpressionMetadata } from "./expressionMetadata.js";
import { LiteralExpression } from "./literalExpression.js";

/**
 * String expression
 */
export class StringLiteralExpression extends LiteralExpression<string> {
    static readonly TYPE = "StringLiteralExpression";

    private static readonly WRAPPER_ENTRIES = new Map([
        ...Expression.expressionWrapperObjectEntries<StringLiteralExpression>(StringLiteralExpression.TYPE),
        ["value", (wrapped, context) => context.newString(wrapped.value)]
    ]);

    /**
     * Creates a new StringLiteralExpression consisting out of a constant string
     *
     * @param value the constant literal
     * @param metadata metadata for the expression
     */
    constructor(value: string, metadata: ExpressionMetadata) {
        super(value, StringLiteralExpression.TYPE, metadata);
    }

    override toWrapperObject(context: InterpreterContext): WrapperObject<this> {
        return context.newWrapperObject(this, StringLiteralExpression.WRAPPER_ENTRIES);
    }
}
