import { DestructuringExpression } from "../../ast/destructuringExpression.js";
import { InterpreterContext } from "../interpreter.js";
import { FieldEntry } from "../objects/baseObject.js";
import { ExecutableExpression } from "./executableExpression.js";

/**
 * Executable DestructuringExpression
 */
export class ExecutableDestructuringExpression extends ExecutableExpression<DestructuringExpression> {
    /**
     * Creates a new ExecutableDestructuringExpression
     *
     * @param expression the expression this represents
     * @param value evaluated to provide the value to assign
     * @param names the names of the fields to assign to
     */
    constructor(
        expression: DestructuringExpression | undefined,
        readonly value: ExecutableExpression<any>,
        readonly names: (string | number)[]
    ) {
        super(expression);
    }

    override evaluateInternal(context: InterpreterContext): FieldEntry {
        const valueValue = this.value.evaluateWithSource(context);
        for (let i = 0; i < this.names.length; i++) {
            context.currentScope.setLocalField(this.names[i], valueValue.value.getFieldEntry(i, context));
        }
        return valueValue;
    }
}
