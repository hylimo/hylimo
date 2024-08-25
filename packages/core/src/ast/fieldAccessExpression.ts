import { CompletionExpressionMetadata } from "./expressionMetadata.js";
import { Expression } from "./expression.js";
import { InterpreterContext } from "../runtime/interpreter/interpreterContext.js";
import { WrapperObject } from "../runtime/objects/wrapperObject.js";

/**
 * Field access expression
 * Evalueates to the value of the field
 */

export class FieldAccessExpression extends Expression<CompletionExpressionMetadata> {
    static readonly TYPE = "FieldAccessExpression";

    private static readonly WRAPPER_ENTRIES = new Map([
        ...Expression.expressionWrapperObjectEntries<FieldAccessExpression>(FieldAccessExpression.TYPE),
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
        ["target", (wrapped, context) => wrapped.target.toWrapperObject(context)]
    ]);

    /**
     * Creates a new IdentifierExpression consisting of a target and a field to access
     *
     * @param target evaluated to provide the target of the field access
     * @param name name or index of the field to access
     * @param metadata metadata for the expression
     */
    constructor(
        readonly name: string | number,
        readonly target: Expression,
        metadata: CompletionExpressionMetadata
    ) {
        super(FieldAccessExpression.TYPE, metadata);
    }

    protected override markNoEditInternal(): void {
        super.markNoEditInternal();
        this.target.markNoEdit();
    }

    override toWrapperObject(context: InterpreterContext): WrapperObject<this> {
        return context.newWrapperObject(this, FieldAccessExpression.WRAPPER_ENTRIES);
    }
}
