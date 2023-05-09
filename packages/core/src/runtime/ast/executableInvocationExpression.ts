import { InvocationExpression } from "../../ast/invocationExpression";
import { InterpreterContext } from "../interpreter";
import { FieldEntry } from "../objects/baseObject";
import { SemanticFieldNames } from "../semanticFieldNames";
import { ExecutableAbstractInvocationExpression } from "./executableAbstractInvocationExpression";
import { ExecutableListEntry } from "./executableListEntry";
import { ExecutableConstExpression } from "./executableConstExpression";
import { ExecutableExpression } from "./executableExpression";

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

    override evaluateInternal(context: InterpreterContext): FieldEntry {
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
