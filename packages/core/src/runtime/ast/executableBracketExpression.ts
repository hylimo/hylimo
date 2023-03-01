import { BracketExpression } from "../../ast/ast";
import { InterpreterContext } from "../interpreter";
import { FieldEntry } from "../objects/baseObject";
import { ExecutableExpression } from "./executableExpression";

/**
 * Expression which evaluates and returns an inner expression
 */
export class ExecutableBracketExpression extends ExecutableExpression<BracketExpression> {
    /**
     * Creates a new BracketExpression consisting of an inner expression
     *
     * @param expression the expression this represents
     * @param innerExpression evaluated to provide the value to return
     */
    constructor(expression: BracketExpression, readonly innerExpression: ExecutableExpression<any>) {
        super(expression);
    }

    override evaluateInternal(context: InterpreterContext): FieldEntry {
        return this.innerExpression.evaluate(context);
    }

    override evaluateWithSource(context: InterpreterContext): FieldEntry {
        return this.innerExpression.evaluateWithSource(context);
    }
}
