import { ConstExpression } from "../../ast/ast";
import { InterpreterContext } from "../interpreter";
import { FieldEntry } from "../objects/baseObject";
import { ExecutableExpression } from "./executableExpression";

/**
 * Executable ConstExpression
 */
export class ExecutableConstExpression extends ExecutableExpression<ConstExpression> {
    /**
     * Creates a new ExecutableConstExpression based on the provided value
     *
     * @param value the value to wrap
     * @returns the created ExecutableConstExpression
     */
    static of(value: FieldEntry): ExecutableConstExpression {
        return new ExecutableConstExpression(new ConstExpression(value));
    }

    override evaluateInternal(_context: InterpreterContext): FieldEntry {
        return this.expression.value;
    }
}
