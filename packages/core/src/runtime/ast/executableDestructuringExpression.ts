import type { DestructuringExpression } from "../../ast/destructuringExpression.js";
import type { InterpreterContext } from "../interpreter/interpreterContext.js";
import type { LabeledValue } from "../objects/labeledValue.js";
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

    override evaluateInternal(context: InterpreterContext): LabeledValue {
        const valueValue = this.value.evaluateWithSource(context);
        for (let i = 0; i < this.names.length; i++) {
            context.currentScope.setLocalField(this.names[i], valueValue.value.getField(i, context), context);
        }
        return valueValue;
    }
}
