import { AssignmentExpression } from "../../ast/assignmentExpression.js";
import { InterpreterContext } from "../interpreter/interpreterContext.js";
import { BaseObject } from "../objects/baseObject.js";
import { LabeledValue } from "../objects/labeledValue.js";
import { ExecutableExpression } from "./executableExpression.js";

/**
 * Executable AssignmentExpression
 */
export class ExecutableAssignmentExpression extends ExecutableExpression<AssignmentExpression> {
    /**
     * Creates a new ExecutableAssignmentExpression
     *
     * @param expression the expression this represents
     * @param target evaluated to provide the object to assign to
     * @param value evaluated to provide the value to assign
     * @param name the name of the field to assign to
     */
    constructor(
        expression: AssignmentExpression | undefined,
        readonly target: ExecutableExpression<any> | undefined,
        readonly value: ExecutableExpression<any>,
        readonly name: string | number
    ) {
        super(expression);
    }

    override evaluateInternal(context: InterpreterContext): LabeledValue {
        let targetValue: BaseObject;
        if (this.target !== undefined) {
            targetValue = this.target.evaluate(context).value;
        } else {
            targetValue = context.currentScope;
        }
        const valueValue = this.value.evaluateWithSource(context);
        if (this.target !== undefined) {
            targetValue.setLocalField(this.name, valueValue, context);
        } else {
            targetValue.setField(this.name, valueValue, context);
        }
        return valueValue;
    }
}
