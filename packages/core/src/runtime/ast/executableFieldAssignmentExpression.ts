import type { FieldAssignmentExpression } from "../../ast/fieldAssignmentExpression.js";
import type { InterpreterContext } from "../interpreter/interpreterContext.js";
import type { LabeledValue } from "../objects/labeledValue.js";
import { ExecutableExpression } from "./executableExpression.js";

/**
 * Executable FieldAssignmentExpression
 */
export class ExecutableFieldAssignmentExpression extends ExecutableExpression<FieldAssignmentExpression> {
    /**
     * Creates a new ExecutableFieldAssignmentExpression
     *
     * @param expression the expression this represents
     * @param target evaluated to provide the object to assign to
     * @param value evaluated to provide the value to assign
     * @param name the name of the field to assign to
     */
    constructor(
        expression: FieldAssignmentExpression | undefined,
        readonly target: ExecutableExpression<any>,
        readonly value: ExecutableExpression<any>,
        readonly name: string | number
    ) {
        super(expression);
    }

    override evaluateInternal(context: InterpreterContext): LabeledValue {
        const targetValue = this.target.evaluate(context).value;
        const valueValue = this.value.evaluateWithSource(context);
        targetValue.setSelfLocalField(this.name, valueValue, context);
        return valueValue;
    }
}
