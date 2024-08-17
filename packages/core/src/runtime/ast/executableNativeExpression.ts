import { InterpreterContext } from "../interpreter/interpreterContext.js";
import { FieldEntry } from "../objects/baseObject.js";
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
    constructor(readonly callback: (context: InterpreterContext) => FieldEntry) {
        super(undefined);
    }

    override evaluateInternal(context: InterpreterContext): FieldEntry {
        return this.callback(context);
    }
}
