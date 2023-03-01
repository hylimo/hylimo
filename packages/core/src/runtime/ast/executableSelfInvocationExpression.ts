import { SelfInvocationExpression } from "../../ast/ast";
import { InterpreterContext } from "../interpreter";
import { FieldEntry } from "../objects/baseObject";
import { SemanticFieldNames } from "../semanticFieldNames";
import {
    ExecutableAbstractInvocationExpression,
    ExecutableInvocationArgument
} from "./executableAbstractInvocationExpression";
import { ExecutableConstExpression } from "./executableConstExpression";
import { ExecutableExpression } from "./executableExpression";

/**
 * Executable SelfInvocationExpression
 */
export class ExecutableSelfInvocationExpression extends ExecutableAbstractInvocationExpression<SelfInvocationExpression> {
    /**
     * Creates a new ExecutableInvocationExpression consisting of an expression of which the result should be invoked,
     * and a set of optionally named expressions as arguments
     *
     * @param expression the expression this represents
     * @param argumentExpressions evaluated to provide arguments
     * @param target evaluated to provide the function to invoke
     */
    constructor(
        expression: SelfInvocationExpression,
        argumentExpressions: ExecutableInvocationArgument[],
        readonly target: ExecutableExpression<any>
    ) {
        super(expression, argumentExpressions);
    }

    override evaluateInternal(context: InterpreterContext): FieldEntry {
        const targetValue = this.target.evaluateWithSource(context);
        const fieldValue = targetValue.value.getField(this.expression.name, context);
        return fieldValue.invoke(
            [
                { value: ExecutableConstExpression.of(targetValue), name: SemanticFieldNames.SELF },
                ...this.argumentExpressions
            ],
            context,
            undefined,
            this.expression
        );
    }
}
