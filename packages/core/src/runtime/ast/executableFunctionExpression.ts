import { FunctionExpression } from "../../ast/ast";
import { InterpreterContext } from "../interpreter";
import { FieldEntry } from "../objects/baseObject";
import { FunctionObject } from "../objects/functionObject";
import { ExecutableExpression } from "./executableExpression";

/**
 * Executable FunctionExpression
 */
export class ExecutableFunctionExpression extends ExecutableExpression<FunctionExpression> {
    /**
     * Creates a new ExecutableFunctionExpression
     *
     * @param expression the expression this represents
     * @param expressions the expressions to execute
     */
    constructor(expression: FunctionExpression, readonly expressions: ExecutableExpression<any>[]) {
        super(expression);
    }

    override evaluateInternal(context: InterpreterContext): FieldEntry {
        return { value: new FunctionObject(this, context.currentScope, context.functionPrototype) };
    }
}
