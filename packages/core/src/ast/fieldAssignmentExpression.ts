import { CompletionExpressionMetadata } from "./expressionMetadata.js";
import { Expression } from "./expression.js";
import { WrapperObject } from "../runtime/objects/wrapperObject.js";
import { InterpreterContext } from "../runtime/interpreter/interpreterContext.js";
import { AbstractAssignmentExpression } from "./abstractAssignmentExpression.js";

/**
 * Field Assignment Expression
 * Evaluates to the assigned value
 */
export class FieldAssignmentExpression extends AbstractAssignmentExpression<CompletionExpressionMetadata> {
    static readonly TYPE = "FieldAssignmentExpression";

    private static readonly WRAPPER_ENTRIES = new Map([
        ...AbstractAssignmentExpression.assignmentExpressionWrapperObjectEntries<FieldAssignmentExpression>(
            FieldAssignmentExpression.TYPE
        ),
        ["name", (wrapped, context) => context.newString(wrapped.name)],
        ["target", (wrapped, context) => wrapped.target.toWrapperObject(context)]
    ]);

    /**
     * Creates a new FieldAssignmentExpression consisting of a value, a field, and a target on which the
     * identifier is accessed.
     *
     * @param name name of the assigned field
     * @param target evaluates to the object where the field is located on
     * @param value evaluates to the assigned value
     * @param metadata metadata for the expression
     */
    constructor(
        readonly name: string,
        readonly target: Expression,
        value: Expression,
        metadata: CompletionExpressionMetadata
    ) {
        super(value, FieldAssignmentExpression.TYPE, metadata);
    }

    protected override markNoEditInternal(): void {
        super.markNoEditInternal();
        this.target.markNoEdit();
    }

    override toWrapperObject(context: InterpreterContext): WrapperObject<this> {
        return context.newWrapperObject(this, FieldAssignmentExpression.WRAPPER_ENTRIES);
    }
}
