import { ExpressionMetadata } from "./expressionMetadata.js";
import { Expression } from "./expression.js";
import { WrapperObjectFieldRetriever } from "../runtime/objects/wrapperObject.js";

/**
 * Base class for all assignment expressions, provides helper to generate args
 */
export abstract class AbstractAssignmentExpression<
    M extends ExpressionMetadata = ExpressionMetadata
> extends Expression<M> {
    /**
     * Creates the common entries for subclass wrapper objects
     *
     * @param type the type of the subclass
     * @returns the common entries for the subclass wrapper object
     */
    static assignmentExpressionWrapperObjectEntries<T extends AbstractAssignmentExpression>(
        type: string
    ): [string | number, WrapperObjectFieldRetriever<T>][] {
        return [
            ...Expression.expressionWrapperObjectEntries<T>(type),
            ["value", (wrapped, context) => wrapped.value.toWrapperObject(context)]
        ];
    }

    /**
     * Base constructor for all AbstractInvocationExpressions
     *
     * @param value evaluates to the assigned value
     * @param metadata metadata for the expression
     * @param type used for serialization and debugging
     */
    constructor(
        readonly value: Expression,
        type: string,
        metadata: M
    ) {
        super(type, metadata);
    }

    protected override markNoEditInternal(): void {
        super.markNoEditInternal();
        this.value.markNoEdit();
    }
}
