import type { InterpreterContext } from "../interpreter/interpreterContext.js";
import type { LabeledValue } from "../objects/labeledValue.js";
import { ExecutableExpression } from "./executableExpression.js";

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
    constructor(readonly callback: (context: InterpreterContext) => LabeledValue) {
        super(undefined);
    }

    override evaluateInternal(context: InterpreterContext): LabeledValue {
        return this.callback(context);
    }
}
