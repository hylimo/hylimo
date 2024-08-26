import { ExpressionMetadata } from "./expressionMetadata.js";
import { Expression } from "./expression.js";
import { InterpreterContext } from "../runtime/interpreter/interpreterContext.js";
import { WrapperObject } from "../runtime/objects/wrapperObject.js";

/*
 * Function operator expression
 * Evaluates to the result of the called function
 */
export class OperatorExpression extends Expression {
    static readonly TYPE = "OperatorExpression";

    private static readonly WRAPPER_ENTRIES = new Map([
        ...Expression.expressionWrapperObjectEntries<OperatorExpression>(OperatorExpression.TYPE),
        ["operator", (wrapped, context) => wrapped.operator.toWrapperObject(context)],
        ["left", (wrapped, context) => wrapped.left.toWrapperObject(context)],
        ["right", (wrapped, context) => wrapped.right.toWrapperObject(context)]
    ]);

    /**
     * Creates a new OperatorExpression consisting of a left and right expression
     *
     * @param operator evaluated to provide the function to invoke
     * @param left the left expression
     * @param right the right expression
     * @param metadata metadata for the expression
     */
    constructor(
        readonly operator: Expression,
        readonly left: Expression,
        readonly right: Expression,
        metadata: ExpressionMetadata
    ) {
        super(OperatorExpression.TYPE, metadata);
    }

    protected override markNoEditInternal(): void {
        super.markNoEditInternal();
        this.operator.markNoEdit();
        this.left.markNoEdit();
        this.right.markNoEdit();
    }

    override toWrapperObject(context: InterpreterContext): WrapperObject<this> {
        return context.newWrapperObject(this, OperatorExpression.WRAPPER_ENTRIES);
    }
}
