import { OperatorExpression } from "../../ast/operatorExpression.js";
import { InterpreterContext } from "../interpreter/interpreterContext.js";
import { FieldEntry } from "../objects/baseObject.js";
import { SemanticFieldNames } from "../semanticFieldNames.js";
import { ExecutableListEntry } from "./executableListEntry.js";
import { ExecutableConstExpression } from "./executableConstExpression.js";
import { ExecutableExpression } from "./executableExpression.js";

/**
 * Executable OperatorExpression
 */
export class ExecutableOperatorExpression extends ExecutableExpression<OperatorExpression> {
    /**
     * Creates a new OperatorExpression consisting of an expression of which the result should be invoked,
     * and a set of optionally named expressions as arguments
     *
     * @param expression the expression this represents
     * @param argumentExpressions evaluated to provide arguments (left and right side)
     * @param target evaluated to provide the function to invoke
     */
    constructor(
        expression: OperatorExpression | undefined,
        readonly argumentExpressions: ExecutableListEntry[],
        readonly target: ExecutableExpression<any>
    ) {
        super(expression);
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
