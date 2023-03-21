import { FunctionExpression } from "../../ast/functionExpression";
import { Type } from "../../types/base";
import { InterpreterContext } from "../interpreter";
import { FieldEntry } from "../objects/baseObject";
import { FunctionObject } from "../objects/functionObject";
import { ExecutableAbstractFunctionExpression } from "./executableAbstractFunctionExpression";
import { ExecutableExpression } from "./executableExpression";

/**
 * Executable FunctionExpression
 */
export class ExecutableFunctionExpression extends ExecutableAbstractFunctionExpression<FunctionExpression> {
    /**
     * Creates a new ExecutableFunctionExpression
     *
     * @param expression the expression this represents
     * @param expressions the expressions to execute
     */
    constructor(
        expression: FunctionExpression | undefined,
        readonly expressions: ExecutableExpression<any>[],
        decorator: Map<string, string | undefined>,
        readonly types?: Map<string | number, Type>
    ) {
        super(expression, decorator);
    }

    override evaluateInternal(context: InterpreterContext): FieldEntry {
        return { value: new FunctionObject(this, context.currentScope, context.functionPrototype) };
    }
}
