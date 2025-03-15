import type { InterpreterContext } from "../runtime/interpreter/interpreterContext.js";
import type { WrapperObject } from "../runtime/objects/wrapperObject.js";
import { Expression } from "./expression.js";
import type { ExpressionMetadata } from "./expressionMetadata.js";
import { LiteralExpression } from "./literalExpression.js";

/**
 * Number expression
 */

export class NumberLiteralExpression extends LiteralExpression<number> {
    static readonly TYPE = "NumberLiteralExpression";

    static readonly WRAPPER_ENTRIES = new Map([
        ...Expression.expressionWrapperObjectEntries<NumberLiteralExpression>(NumberLiteralExpression.TYPE),
        ["value", (wrapped, context) => context.newNumber(wrapped.value)]
    ]);

    /**
     * Creates a new NumberLiteralExpression consisting out of a constant number
     *
     * @param value the constant literal
     * @param metadata metadata for the expression
     */
    constructor(value: number, metadata: ExpressionMetadata) {
        super(value, NumberLiteralExpression.TYPE, metadata);
    }

    override toWrapperObject(context: InterpreterContext): WrapperObject<this> {
        return context.newWrapperObject(this, NumberLiteralExpression.WRAPPER_ENTRIES);
    }
}
