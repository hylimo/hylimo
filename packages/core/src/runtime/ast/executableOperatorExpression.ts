import { OperatorExpression } from "../../ast/operatorExpression.js";
import { InterpreterContext } from "../interpreter/interpreterContext.js";
import { FieldEntry } from "../objects/baseObject.js";
import { SemanticFieldNames } from "../semanticFieldNames.js";
import { ExecutableConstExpression } from "./executableConstExpression.js";
import { ExecutableExpression } from "./executableExpression.js";

/**
 * Executable OperatorExpression
 */
export class ExecutableOperatorExpression extends ExecutableExpression<OperatorExpression> {
    /**
     * Creates a new OperatorExpression consisting of an operator expression, and a left and right side expression.
     *
     * @param expression the expression this represents
     * @param left the left side of the operator
     * @param right the right side of the operator
     * @param target evaluated to provide the function to invoke
     */
    constructor(
        expression: OperatorExpression | undefined,
        readonly left: ExecutableExpression<any>,
        readonly right: ExecutableExpression<any>,
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
                {
                    value: this.left
                },
                {
                    value: this.right
                }
            ],
            context,
            undefined,
            this.expression
        );
    }
}
