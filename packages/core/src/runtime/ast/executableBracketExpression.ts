import { BracketExpression } from "../../ast/bracketExpression.js";
import { InterpreterContext } from "../interpreter.js";
import { FieldEntry } from "../objects/baseObject.js";
import { ExecutableExpression } from "./executableExpression.js";

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
    constructor(expression: BracketExpression | undefined, readonly innerExpression: ExecutableExpression<any>) {
        super(expression);
    }

    override evaluateInternal(context: InterpreterContext): FieldEntry {
        return this.innerExpression.evaluate(context);
    }

    override evaluateWithSource(context: InterpreterContext): FieldEntry {
        return this.innerExpression.evaluateWithSource(context);
    }
}
