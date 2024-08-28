import { StringLiteralExpression } from "../../ast/stringLiteralExpression.js";
import { InterpreterContext } from "../interpreter/interpreterContext.js";
import { LabeledValue } from "../objects/labeledValue.js";
import { StringObject } from "../objects/stringObject.js";
import { ExecutableLiteralExpression } from "./executableLiteralExpression.js";

/**
 * Executable StringLiteralExpression
 */
export class ExecutableStringLiteralExpression extends ExecutableLiteralExpression<StringLiteralExpression> {
    override evaluateInternal(context: InterpreterContext): LabeledValue {
        return { value: new StringObject(this.value, context.stringPrototype) };
    }
}
