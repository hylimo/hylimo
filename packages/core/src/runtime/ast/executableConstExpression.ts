import { Expression } from "../../ast/expression.js";
import { LabeledValue } from "../objects/labeledValue.js";
import { ExecutableExpression } from "./executableExpression.js";

/**
 * Executable ConstExpression
 */
export class ExecutableConstExpression extends ExecutableExpression {
    /**
     * Creates a new ExecutableConstExpression based on the provided value
     *
     * @param value the value to wrap
     * @param expression the expression this represents
     */
    constructor(
        readonly value: LabeledValue,
        expression?: Expression
    ) {
        super(expression);
    }

    override evaluateInternal(): LabeledValue {
        return this.value;
    }
}
