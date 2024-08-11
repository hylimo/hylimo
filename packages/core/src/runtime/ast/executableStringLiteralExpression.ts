import { StringLiteralExpression } from "../../ast/stringLiteralExpression.js";
import { InterpreterContext } from "../interpreter.js";
import { FieldEntry } from "../objects/baseObject.js";
import { StringObject } from "../objects/stringObject.js";
import { ExecutableLiteralExpression } from "./executableLiteralExpression.js";

/**
 * Executable StringLiteralExpression
 */
export class ExecutableStringLiteralExpression extends ExecutableLiteralExpression<StringLiteralExpression> {
    override evaluateInternal(context: InterpreterContext): FieldEntry {
        return { value: new StringObject(this.value, context.stringPrototype) };
    }
}
