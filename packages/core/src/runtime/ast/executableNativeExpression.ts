import { InterpreterContext } from "../interpreter";
import { FieldEntry } from "../objects/baseObject";
import { ExecutableExpression } from "./executableExpression";

/**
 * Executable NativeExpression
 */
export class ExecutableNativeExpression extends ExecutableExpression {
    /**
     * Creates a new ExecutableNativeExpression based on the provided callback
     *
     * @param expression the expression this represents
     * @param callback the callback to evaluate
     */
    constructor(readonly callback: (context: InterpreterContext) => FieldEntry) {
        super(undefined);
    }

    override evaluateInternal(context: InterpreterContext): FieldEntry {
        return this.callback(context);
    }
}
