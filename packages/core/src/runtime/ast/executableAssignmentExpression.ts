import { AssignmentExpression } from "../../ast/ast";
import { InterpreterContext } from "../interpreter";
import { BaseObject, FieldEntry } from "../objects/baseObject";
import { ExecutableExpression } from "./executableExpression";

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
     */
    constructor(
        expression: AssignmentExpression,
        readonly target: ExecutableExpression<any> | undefined,
        readonly value: ExecutableExpression<any>
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
            targetValue.setLocalField(this.expression.name, valueValue);
        } else {
            targetValue.setFieldEntry(this.expression.name, valueValue, context);
        }
        return valueValue;
    }
}
