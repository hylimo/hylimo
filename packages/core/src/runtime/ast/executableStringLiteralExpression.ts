import { StringLiteralExpression } from "../../ast/ast";
import { InterpreterContext } from "../interpreter";
import { FieldEntry } from "../objects/baseObject";
import { StringObject } from "../objects/stringObject";
import { ExecutableExpression } from "./executableExpression";

/**
 * Executable StringLiteralExpression
 */
export class ExecutableStringLiteralExpression extends ExecutableExpression<StringLiteralExpression> {
    override evaluateInternal(context: InterpreterContext): FieldEntry {
        return { value: new StringObject(this.expression.value, context.stringPrototype) };
    }
}
