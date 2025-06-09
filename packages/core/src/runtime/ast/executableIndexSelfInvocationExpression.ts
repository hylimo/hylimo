import type { IndexSelfInvocationExpression } from "../../ast/indexSelfInvocationExpression.js";
import type { InterpreterContext } from "../interpreter/interpreterContext.js";
import type { LabeledValue } from "../objects/labeledValue.js";
import { SemanticFieldNames } from "../semanticFieldNames.js";
import { ExecutableAbstractInvocationExpression } from "./executableAbstractInvocationExpression.js";
import type { ExecutableListEntry } from "./executableListEntry.js";
import { ExecutableConstExpression } from "./executableConstExpression.js";
import type { ExecutableExpression } from "./executableExpression.js";
import { assertIndex } from "../../stdlib/typeHelpers.js";

/**
 * Executable SelfInvocationExpression
 */
export class ExecutableIndexSelfInvocationExpression extends ExecutableAbstractInvocationExpression<IndexSelfInvocationExpression> {
    /**
     * Creates a new ExecutableInvocationExpression consisting of an expression of which the result should be invoked,
     * and a set of optionally named expressions as arguments
     *
     * @param expression the expression this represents
     * @param argumentExpressions evaluated to provide arguments
     * @param target evaluated to provide the function to invoke
     * @param index evaluated to provide the index to access on target
     */
    constructor(
        expression: IndexSelfInvocationExpression | undefined,
        argumentExpressions: ExecutableListEntry[],
        readonly target: ExecutableExpression<any>,
        readonly index: ExecutableExpression<any>
    ) {
        super(expression, argumentExpressions);
    }

    override evaluateInternal(context: InterpreterContext): LabeledValue {
        const targetValue = this.target.evaluateWithSource(context);
        const indexValue = this.index.evaluate(context).value;
        const fieldValue = targetValue.value.getSelfFieldValue(assertIndex(indexValue), context);
        return fieldValue.invoke(
            [
                { value: new ExecutableConstExpression(targetValue), name: SemanticFieldNames.SELF },
                ...this.argumentExpressions
            ],
            context,
            undefined,
            this.expression
        );
    }
}
