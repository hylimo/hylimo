import { IdentifierExpression } from "../../ast/ast";
import { InterpreterContext } from "../interpreter";
import { FieldEntry } from "../objects/baseObject";
import { ExecutableExpression } from "./executableExpression";

/**
 * Executable IdentifierExpression
 */
export class ExecutableIdentifierExpression extends ExecutableExpression<IdentifierExpression> {
    override evaluateInternal(context: InterpreterContext): FieldEntry {
        return context.currentScope.getFieldEntry(this.expression.identifier, context);
    }
}
