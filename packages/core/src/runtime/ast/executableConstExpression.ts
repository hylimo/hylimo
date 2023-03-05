import { InterpreterContext } from "../interpreter";
import { FieldEntry } from "../objects/baseObject";
import { ExecutableExpression } from "./executableExpression";

/**
 * Executable ConstExpression
 */
export class ExecutableConstExpression extends ExecutableExpression<undefined> {
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
