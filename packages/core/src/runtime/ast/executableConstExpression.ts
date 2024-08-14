import { InterpreterContext } from "../interpreter.js";
import { FieldEntry } from "../objects/baseObject.js";
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
    constructor(readonly value: FieldEntry) {
        super(undefined);
    }

    override evaluateInternal(_context: InterpreterContext): FieldEntry {
        return this.value;
    }
}
