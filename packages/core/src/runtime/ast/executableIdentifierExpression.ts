import type { IdentifierExpression } from "../../ast/identifierExpression.js";
import type { InterpreterContext } from "../interpreter/interpreterContext.js";
import type { LabeledValue } from "../objects/labeledValue.js";
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
        return context.currentScope.getSelfField(this.identifier, context);
    }
}
