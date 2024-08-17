import { CompletionExpressionMetadata } from "./expressionMetadata.js";
import { Expression } from "./expression.js";
import { WrapperObject } from "../runtime/objects/wrapperObject.js";
import { InterpreterContext } from "../runtime/interpreter.js";

/**
 * Assignment Expression
 * Evaluates to the assigned value
 */

export class AssignmentExpression extends Expression<CompletionExpressionMetadata> {
    static readonly TYPE = "AssignmentExpression";

    private static readonly WRAPPER_ENTRIES = new Map([
        ...Expression.expressionWrapperObjectEntries<AssignmentExpression>(AssignmentExpression.TYPE),
        ["name", (wrapped, context) => context.newString(wrapped.name)],
        ["target", (wrapped, context) => wrapped.target?.toWrapperObject(context) ?? context.null],
        ["value", (wrapped, context) => wrapped.value.toWrapperObject(context)]
    ]);

    /**
     * Creates a new AssignmentExpression consisting of a value, a field, and an optional target on which the
     * identifier is accessed.
     *
     * @param name name of the assigned field
     * @param target evaluates to the object where the field is located on, if not present, the scope is used
     * @param value evaluates to the assigned value
     * @param metadata metadata for the expression
     */
    constructor(
        readonly name: string,
        readonly target: Expression | undefined,
        readonly value: Expression,
        metadata: CompletionExpressionMetadata
    ) {
        super(AssignmentExpression.TYPE, metadata);
    }

    protected override markNoEditInternal(): void {
        super.markNoEditInternal();
        this.value.markNoEdit();
        if (this.target != undefined) {
            this.target.markNoEdit();
        }
    }

    override toWrapperObject(context: InterpreterContext): WrapperObject<this> {
        return context.newWrapperObject(this, AssignmentExpression.WRAPPER_ENTRIES);
    }
}
