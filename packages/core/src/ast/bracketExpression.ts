import type { ExpressionMetadata } from "./expressionMetadata.js";
import { Expression } from "./expression.js";
import type { InterpreterContext } from "../runtime/interpreter/interpreterContext.js";
import type { WrapperObject } from "../runtime/objects/wrapperObject.js";

/**
 * Expression which evaluates and returns an inner expression
 */
export class BracketExpression extends Expression {
    static readonly TYPE = "BracketExpression";

    private static readonly WRAPPER_ENTRIES = new Map([
        ...Expression.expressionWrapperObjectEntries<BracketExpression>(BracketExpression.TYPE),
        ["expression", (wrapped, context) => wrapped.expression.toWrapperObject(context)]
    ]);

    /**
     * Creates a new BracketExpression consisting of an inner expression
     *
     * @param expression the inner expression
     * @param metadata metadata for the expression
     */
    constructor(
        readonly expression: Expression,
        metadata: ExpressionMetadata
    ) {
        super(BracketExpression.TYPE, metadata);
    }

    protected override markNoEditInternal(): void {
        super.markNoEditInternal();
        this.expression.markNoEdit();
    }

    override toWrapperObject(context: InterpreterContext): WrapperObject<this> {
        return context.newWrapperObject(this, BracketExpression.WRAPPER_ENTRIES);
    }
}
