import type { InvocationExpression } from "../../ast/invocationExpression.js";
import type { InterpreterContext } from "../interpreter/interpreterContext.js";
import type { LabeledValue } from "../objects/labeledValue.js";
import { SemanticFieldNames } from "../semanticFieldNames.js";
import { ExecutableAbstractInvocationExpression } from "./executableAbstractInvocationExpression.js";
import type { ExecutableListEntry } from "./executableListEntry.js";
import { ExecutableConstExpression } from "./executableConstExpression.js";
import type { ExecutableExpression } from "./executableExpression.js";

/**
 * Executable InvocationExpression
 */
export class ExecutableInvocationExpression extends ExecutableAbstractInvocationExpression<InvocationExpression> {
    /**
     * Creates a new InvocationExpression consisting of an expression of which the result should be invoked,
     * and a set of optionally named expressions as arguments
     *
     * @param expression the expression this represents
     * @param argumentExpressions evaluated to provide arguments
     * @param target evaluated to provide the function to invoke
     */
    constructor(
        expression: InvocationExpression | undefined,
        argumentExpressions: ExecutableListEntry[],
        readonly target: ExecutableExpression<any>
    ) {
        super(expression, argumentExpressions);
    }

    override evaluateInternal(context: InterpreterContext): LabeledValue {
        const targetValue = this.target.evaluate(context).value;
        return targetValue.invoke(
            [
                {
                    value: new ExecutableConstExpression({ value: context.currentScope }),
                    name: SemanticFieldNames.SELF
                },
                ...this.argumentExpressions
            ],
            context,
            undefined,
            this.expression
        );
    }
}
