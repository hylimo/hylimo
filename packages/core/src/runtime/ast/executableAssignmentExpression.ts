import type { AssignmentExpression } from "../../ast/assignmentExpression.js";
import type { InterpreterContext } from "../interpreter/interpreterContext.js";
import type { LabeledValue } from "../objects/labeledValue.js";
import { ExecutableExpression } from "./executableExpression.js";

/**
 * Executable AssignmentExpression
 */
export class ExecutableAssignmentExpression extends ExecutableExpression<AssignmentExpression> {
    /**
     * Creates a new ExecutableAssignmentExpression
     *
     * @param expression the expression this represents
     * @param value evaluated to provide the value to assign
     * @param name the name of the field to assign to
     */
    constructor(
        expression: AssignmentExpression | undefined,
        readonly value: ExecutableExpression<any>,
        readonly name: string | number
    ) {
        super(expression);
    }

    override evaluateInternal(context: InterpreterContext): LabeledValue {
        const targetValue = context.currentScope;
        const valueValue = this.value.evaluateWithSource(context);
        targetValue.setField(this.name, valueValue, context, targetValue);
        return valueValue;
    }
}
