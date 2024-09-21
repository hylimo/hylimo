import { FieldSelfInvocationExpression } from "../../ast/fieldSelfInvocationExpression.js";
import { InterpreterContext } from "../interpreter/interpreterContext.js";
import { LabeledValue } from "../objects/labeledValue.js";
import { SemanticFieldNames } from "../semanticFieldNames.js";
import { ExecutableAbstractInvocationExpression } from "./executableAbstractInvocationExpression.js";
import { ExecutableListEntry } from "./executableListEntry.js";
import { ExecutableConstExpression } from "./executableConstExpression.js";
import { ExecutableExpression } from "./executableExpression.js";

/**
 * Executable SelfInvocationExpression
 */
export class ExecutableFieldSelfInvocationExpression extends ExecutableAbstractInvocationExpression<FieldSelfInvocationExpression> {
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
        expression: FieldSelfInvocationExpression | undefined,
        argumentExpressions: ExecutableListEntry[],
        readonly target: ExecutableExpression<any>,
        readonly name: string | number
    ) {
        super(expression, argumentExpressions);
    }

    override evaluateInternal(context: InterpreterContext): LabeledValue {
        const targetValue = this.target.evaluateWithSource(context);
        const fieldValue = targetValue.value.getFieldValue(this.name, context);
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
