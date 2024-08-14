import { AssignmentExpression } from "../../ast/assignmentExpression.js";
import { InterpreterContext } from "../interpreter.js";
import { BaseObject, FieldEntry } from "../objects/baseObject.js";
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

    override evaluateInternal(context: InterpreterContext): FieldEntry {
        let targetValue: BaseObject;
        if (this.target) {
            targetValue = this.target.evaluate(context).value;
        } else {
            targetValue = context.currentScope;
        }
        const valueValue = this.value.evaluateWithSource(context);
        if (this.target) {
            targetValue.setLocalField(this.name, valueValue);
        } else {
            targetValue.setFieldEntry(this.name, valueValue, context);
        }
        return valueValue;
    }
}
