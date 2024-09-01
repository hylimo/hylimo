import { NumberLiteralExpression } from "../../ast/numberLiteralExpression.js";
import { InterpreterContext } from "../interpreter/interpreterContext.js";
import { LabeledValue } from "../objects/labeledValue.js";
import { NumberObject } from "../objects/numberObject.js";
import { ExecutableLiteralExpression } from "./executableLiteralExpression.js";

/**
 * Executable NumberLiteralExpression
 */
export class ExecutableNumberLiteralExpression extends ExecutableLiteralExpression<NumberLiteralExpression> {
    override evaluateInternal(context: InterpreterContext): LabeledValue {
        return { value: new NumberObject(this.value, context.numberPrototype) };
    }
}
