import { IdentifierExpression } from "../../ast/identifierExpression.js";
import { InterpreterContext } from "../interpreter/interpreterContext.js";
import { LabeledValue } from "../objects/labeledValue.js";
import { ExecutableExpression } from "./executableExpression.js";

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
    constructor(
        expression: IdentifierExpression | undefined,
        readonly identifier: string
    ) {
        super(expression);
    }

    override evaluateInternal(context: InterpreterContext): LabeledValue {
        return context.currentScope.getField(this.identifier, context);
    }
}
