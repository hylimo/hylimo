import { FieldAccessExpression } from "../../ast/ast";
import { InterpreterContext } from "../interpreter";
import { FieldEntry } from "../objects/baseObject";
import { ExecutableExpression } from "./executableExpression";

/**
 * Executable FieldAccessExpression
 */
export class ExecutableFieldAccessExpression extends ExecutableExpression<FieldAccessExpression> {
    /**
     * Creates a new ExecutableIdentifierExpression consisting of a target and a field to access
     *
     * @param expression the expression this represents
     * @param target evaluated to provide the object to access
     */
    constructor(expression: FieldAccessExpression, readonly target: ExecutableExpression<any>) {
        super(expression);
    }

    override evaluateInternal(context: InterpreterContext): FieldEntry {
        const targetValue = this.target.evaluate(context).value;
        return targetValue.getFieldEntry(this.expression.name, context);
    }
}
