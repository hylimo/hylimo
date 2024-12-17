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
     */
    constructor(readonly value: LabeledValue) {
        super(undefined);
    }

    override evaluateInternal(): LabeledValue {
        return this.value;
    }
}
