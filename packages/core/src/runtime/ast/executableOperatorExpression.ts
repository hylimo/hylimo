import type { OperatorExpression } from "../../ast/operatorExpression.js";
import type { InterpreterContext } from "../interpreter/interpreterContext.js";
import type { LabeledValue } from "../objects/labeledValue.js";
import { SemanticFieldNames } from "../semanticFieldNames.js";
import type { ExecutableListEntry } from "./executableListEntry.js";
import { ExecutableExpression } from "./executableExpression.js";
import { selfExpression } from "./executableSelfExpression.js";

/**
 * Executable OperatorExpression
 */
export class ExecutableOperatorExpression extends ExecutableExpression<OperatorExpression> {
    /**
     * The argument list passed to invoke (implicit `self` plus left and right operand). As all entries
     * are constant for this operator, the list is built once instead of on every evaluation.
     */
    private readonly invocationArguments: ExecutableListEntry[];

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
        this.invocationArguments = [
            { value: selfExpression, name: SemanticFieldNames.SELF },
            { value: left },
            { value: right }
        ];
    }

    override evaluateInternal(context: InterpreterContext): LabeledValue {
        const targetValue = this.target.evaluate(context).value;
        return targetValue.invoke(this.invocationArguments, context, undefined, this.expression);
    }
}
