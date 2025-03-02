import type { CompletionExpressionMetadata } from "./expressionMetadata.js";
import type { Expression } from "./expression.js";
import type { WrapperObject } from "../runtime/objects/wrapperObject.js";
import type { InterpreterContext } from "../runtime/interpreter/interpreterContext.js";
import { AbstractAssignmentExpression } from "./abstractAssignmentExpression.js";

/**
 * Assignment Expression
 * Evaluates to the assigned value
 */
export class AssignmentExpression extends AbstractAssignmentExpression<CompletionExpressionMetadata> {
    static readonly TYPE = "AssignmentExpression";

    private static readonly WRAPPER_ENTRIES = new Map([
        ...AbstractAssignmentExpression.assignmentExpressionWrapperObjectEntries<AssignmentExpression>(
            AssignmentExpression.TYPE
        ),
        ["name", (wrapped, context) => context.newString(wrapped.name)]
    ]);

    /**
     * Creates a new AssignmentExpression consisting of a value, a field, and an optional target on which the
     * identifier is accessed.
     *
     * @param name name of the assigned field
     * @param value evaluates to the assigned value
     * @param metadata metadata for the expression
     */
    constructor(
        readonly name: string,
        value: Expression,
        metadata: CompletionExpressionMetadata
    ) {
        super(value, AssignmentExpression.TYPE, metadata);
    }

    override toWrapperObject(context: InterpreterContext): WrapperObject<this> {
        return context.newWrapperObject(this, AssignmentExpression.WRAPPER_ENTRIES);
    }
}
