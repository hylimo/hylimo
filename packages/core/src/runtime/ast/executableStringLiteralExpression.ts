import { StringLiteralExpression } from "../../ast/stringLiteralExpression";
import { InterpreterContext } from "../interpreter";
import { FieldEntry } from "../objects/baseObject";
import { StringObject } from "../objects/stringObject";
import { ExecutableLiteralExpression } from "./executableLiteralExpression";

/**
 * Executable StringLiteralExpression
 */
export class ExecutableStringLiteralExpression extends ExecutableLiteralExpression<StringLiteralExpression> {
    override evaluateInternal(context: InterpreterContext): FieldEntry {
        return { value: new StringObject(this.value, context.stringPrototype) };
    }
}
