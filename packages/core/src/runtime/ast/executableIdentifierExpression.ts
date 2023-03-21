import { IdentifierExpression } from "../../ast/identifierExpression";
import { InterpreterContext } from "../interpreter";
import { FieldEntry } from "../objects/baseObject";
import { ExecutableExpression } from "./executableExpression";

/**
 * Executable IdentifierExpression
 */
export class ExecutableIdentifierExpression extends ExecutableExpression<IdentifierExpression> {
    /**
     * Creates a new ExecutableIdentifierExpression consisting of an identifier
     *
     * @param expression the expression this represents
     * @param identifier the identifier to access
     */
    constructor(expression: IdentifierExpression | undefined, readonly identifier: string) {
        super(expression);
    }

    override evaluateInternal(context: InterpreterContext): FieldEntry {
        return context.currentScope.getFieldEntry(this.identifier, context);
    }
}
