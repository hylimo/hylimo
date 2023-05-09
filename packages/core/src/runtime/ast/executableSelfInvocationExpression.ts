import { SelfInvocationExpression } from "../../ast/selfInvocationExpression";
import { InterpreterContext } from "../interpreter";
import { FieldEntry } from "../objects/baseObject";
import { SemanticFieldNames } from "../semanticFieldNames";
import { ExecutableAbstractInvocationExpression } from "./executableAbstractInvocationExpression";
import { ExecutableListEntry } from "./executableListEntry";
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
     * @param name the name of the field to access
     */
    constructor(
        expression: SelfInvocationExpression | undefined,
        argumentExpressions: ExecutableListEntry[],
        readonly target: ExecutableExpression<any>,
        readonly name: string | number
    ) {
        super(expression, argumentExpressions);
    }

    override evaluateInternal(context: InterpreterContext): FieldEntry {
        const targetValue = this.target.evaluateWithSource(context);
        const fieldValue = targetValue.value.getField(this.name, context);
        return fieldValue.invoke(
            [
                { value: new ExecutableConstExpression(targetValue), name: SemanticFieldNames.SELF },
                ...this.argumentExpressions
            ],
            context,
            undefined,
            this.expression
        );
    }
}
