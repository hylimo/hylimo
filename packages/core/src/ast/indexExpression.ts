import type { InterpreterContext } from "../runtime/interpreter/interpreterContext.js";
import type { WrapperObject } from "../runtime/objects/wrapperObject.js";
import { Expression } from "./expression.js";
import type { ExpressionMetadata } from "./expressionMetadata.js";

/**
 * Index expression
 * Evaluates to the value of the field defined by the index expression
 */
export class IndexExpression extends Expression {
    static readonly TYPE = "IndexExpression";

    private static readonly WRAPPER_ENTRIES = new Map([
        ...Expression.expressionWrapperObjectEntries<IndexExpression>(IndexExpression.TYPE),
        ["target", (wrapped, context) => wrapped.target.toWrapperObject(context)],
        ["index", (wrapped, context) => wrapped.index.toWrapperObject(context)]
    ]);

    /**
     * Creates a new IndexExpression consisting of a target and an index which evaluates to the field to access
     *
     * @param index evaluated to provide the field to access
     * @param target evaluates to provide the target of the index access
     * @param metadata metadata for the expression
     */
    constructor(
        readonly index: Expression,
        readonly target: Expression,
        metadata: ExpressionMetadata
    ) {
        super(IndexExpression.TYPE, metadata);
    }

    protected override markNoEditInternal(): void {
        super.markNoEditInternal();
        this.target.markNoEdit();
        this.index.markNoEdit();
    }

    override toWrapperObject(context: InterpreterContext): WrapperObject<this> {
        return context.newWrapperObject(this, IndexExpression.WRAPPER_ENTRIES);
    }
}
