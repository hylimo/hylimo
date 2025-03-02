import type { ExpressionMetadata } from "./expressionMetadata.js";
import type { Expression } from "./expression.js";
import type { WrapperObject } from "../runtime/objects/wrapperObject.js";
import type { InterpreterContext } from "../runtime/interpreter/interpreterContext.js";
import { AbstractAssignmentExpression } from "./abstractAssignmentExpression.js";

/**
 * Index Assignment Expression
 * Evaluates to the assigned value
 */
export class IndexAssignmentExpression extends AbstractAssignmentExpression {
    static readonly TYPE = "IndexAssignmentExpression";

    private static readonly WRAPPER_ENTRIES = new Map([
        ...AbstractAssignmentExpression.assignmentExpressionWrapperObjectEntries<IndexAssignmentExpression>(
            IndexAssignmentExpression.TYPE
        ),
        ["index", (wrapped, context) => wrapped.index.toWrapperObject(context)],
        ["target", (wrapped, context) => wrapped.target.toWrapperObject(context)]
    ]);

    /**
     * Creates a new IndexAssignmentExpression consisting of a value, a index, and an optional target on which the
     * identifier is accessed.
     *
     * @param index evaluates to the the field which the value is assigned to
     * @param target evaluates to the object where the index is located on
     * @param value evaluates to the assigned value
     * @param metadata metadata for the expression
     */
    constructor(
        readonly index: Expression,
        readonly target: Expression,
        value: Expression,
        metadata: ExpressionMetadata
    ) {
        super(value, IndexAssignmentExpression.TYPE, metadata);
    }

    protected override markNoEditInternal(): void {
        super.markNoEditInternal();
        this.target.markNoEdit();
    }

    override toWrapperObject(context: InterpreterContext): WrapperObject<this> {
        return context.newWrapperObject(this, IndexAssignmentExpression.WRAPPER_ENTRIES);
    }
}
