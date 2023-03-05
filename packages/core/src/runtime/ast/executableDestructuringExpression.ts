import { DestructuringExpression } from "../../ast/ast";
import { InterpreterContext } from "../interpreter";
import { FieldEntry } from "../objects/baseObject";
import { ExecutableExpression } from "./executableExpression";

/**
 * Executable DestructuringExpression
 */
export class ExecutableDestructuringExpression extends ExecutableExpression<DestructuringExpression> {
    /**
     * Creates a new ExecutableDestructuringExpression
     *
     * @param expression the expression this represents
     * @param value evaluated to provide the value to assign
     */
    constructor(expression: DestructuringExpression, readonly value: ExecutableExpression<any>) {
        super(expression);
    }

    override evaluateInternal(context: InterpreterContext): FieldEntry {
        const valueValue = this.value.evaluateWithSource(context);
        const names = this.expression.names;
        for (let i = 0; i < names.length; i++) {
            context.currentScope.setLocalField(names[i], valueValue.value.getFieldEntry(i, context));
        }
        return valueValue;
    }
}
