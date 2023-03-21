import { NumberLiteralExpression } from "../../ast/numberLiteralExpression";
import { InterpreterContext } from "../interpreter";
import { FieldEntry } from "../objects/baseObject";
import { NumberObject } from "../objects/numberObject";
import { ExecutableLiteralExpression } from "./executableLiteralExpression";

/**
 * Executable NumberLiteralExpression
 */
export class ExecutableNumberLiteralExpression extends ExecutableLiteralExpression<NumberLiteralExpression> {
    override evaluateInternal(context: InterpreterContext): FieldEntry {
        return { value: new NumberObject(this.value, context.numberPrototype) };
    }
}
