import type { IndexAssignmentExpression } from "../../ast/indexAssignmentExpression.js";
import { assertIndex } from "../../stdlib/typeHelpers.js";
import type { InterpreterContext } from "../interpreter/interpreterContext.js";
import type { LabeledValue } from "../objects/labeledValue.js";
import { ExecutableExpression } from "./executableExpression.js";

/**
 * Executable IndexAssignmentExpression
 */
export class ExecutableIndexAssignmentExpression extends ExecutableExpression<IndexAssignmentExpression> {
    /**
     * Creates a new ExecutableIndexAssignmentExpression
     *
     * @param expression the expression this represents
     * @param target evaluated to provide the object to assign to
     * @param value evaluated to provide the value to assign
     * @param index evaluated to provide the index to assign to
     */
    constructor(
        expression: IndexAssignmentExpression | undefined,
        readonly target: ExecutableExpression<any>,
        readonly value: ExecutableExpression<any>,
        readonly index: ExecutableExpression<any>
    ) {
        super(expression);
    }

    override evaluateInternal(context: InterpreterContext): LabeledValue {
        const targetValue = this.target.evaluate(context).value;
        const valueValue = this.value.evaluateWithSource(context);
        const indexValue = this.index.evaluate(context).value;
        targetValue.setLocalField(assertIndex(indexValue), valueValue, context);
        return valueValue;
    }
}
