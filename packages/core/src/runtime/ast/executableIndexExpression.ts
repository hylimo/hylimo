import { IndexExpression } from "../../ast/indexExpression.js";
import { assertIndex } from "../../stdlib/typeHelpers.js";
import { InterpreterContext } from "../interpreter/interpreterContext.js";
import { LabeledValue } from "../objects/labeledValue.js";
import { ExecutableExpression } from "./executableExpression.js";

/**
 * Executable IndexExpression
 */
export class ExecutableIndexExpression extends ExecutableExpression<IndexExpression> {
    /**
     * Creates a new ExecutableIndexExpression consisting of a target and an index
     * which evaluates to the field to access.
     *
     * @param expression the expression this represents
     * @param target evaluated to provide the object to access
     * @param index evaluated to provide the field to access
     */
    constructor(
        expression: IndexExpression | undefined,
        readonly target: ExecutableExpression<any>,
        readonly index: ExecutableExpression<any>
    ) {
        super(expression);
    }

    override evaluateInternal(context: InterpreterContext): LabeledValue {
        const targetValue = this.target.evaluate(context).value;
        const indexValue = this.index.evaluate(context).value;
        return targetValue.getField(assertIndex(indexValue), context);
    }
}
