import { NumberLiteralExpression } from "../../ast/ast";
import { InterpreterContext } from "../interpreter";
import { FieldEntry } from "../objects/baseObject";
import { NumberObject } from "../objects/numberObject";
import { ExecutableExpression } from "./executableExpression";

/**
 * Executable NumberLiteralExpression
 */
export class ExecutableNumberLiteralExpression extends ExecutableExpression<NumberLiteralExpression> {
    override evaluateInternal(context: InterpreterContext): FieldEntry {
        return { value: new NumberObject(this.expression.value, context.numberPrototype) };
    }
}
