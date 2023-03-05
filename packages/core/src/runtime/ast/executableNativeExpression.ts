import { NativeExpression } from "../../ast/ast";
import { InterpreterContext } from "../interpreter";
import { FieldEntry } from "../objects/baseObject";
import { ExecutableExpression } from "./executableExpression";

/**
 * Executable NativeExpression
 */
export class ExecutableNativeExpression extends ExecutableExpression<NativeExpression> {
    override evaluateInternal(context: InterpreterContext): FieldEntry {
        return this.expression.callback(context);
    }
}
