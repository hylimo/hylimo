import { ExpressionMetadata } from "./expressionMetadata.js";
import { Expression } from "./expression.js";
import { InterpreterContext } from "../runtime/interpreter.js";
import { WrapperObject } from "../runtime/objects/wrapperObject.js";

/**
 * Normal function expression
 */

export class FunctionExpression extends Expression {
    static readonly TYPE = "FunctionExpression";

    private static readonly WRAPPER_ENTRIES = new Map([
        ...Expression.expressionWrapperObjectEntries<FunctionExpression>(FunctionExpression.TYPE),
        [
            "expressions",
            (wrapped, context) => {
                return context.newListWrapperObject(wrapped.expressions, (element) => element.toWrapperObject(context));
            }
        ]
    ]);

    /**
     * Creates a new FunctionExpression consisting of  a block which is executed.
     *
     * @param expressions the content of the function
     * @param metadata metadata for the expression
     * @param types argument types to check on invocation
     */
    constructor(
        readonly expressions: Expression[],
        metadata: ExpressionMetadata
    ) {
        super(FunctionExpression.TYPE, metadata);
    }

    override markNoEditInternal(): void {
        super.markNoEditInternal();
        for (const expression of this.expressions) {
            expression.markNoEdit();
        }
    }

    override toWrapperObject(context: InterpreterContext): WrapperObject<this> {
        return context.newWrapperObject(this, FunctionExpression.WRAPPER_ENTRIES);
    }
}
