import { FunctionExpression } from "../../ast/functionExpression";
import { InterpreterContext } from "../interpreter";
import { FieldEntry } from "../objects/baseObject";
import { FunctionObject } from "../objects/functionObject";
import { ExecutableAbstractFunctionExpression, FunctionDocumentation } from "./executableAbstractFunctionExpression";
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
     * @param documentation the documentation of the function
     */
    constructor(
        expression: FunctionExpression | undefined,
        readonly expressions: ExecutableExpression<any>[],
        documentation: FunctionDocumentation | undefined
    ) {
        super(expression, documentation);
    }

    override evaluateInternal(context: InterpreterContext): FieldEntry {
        return {
            value: new FunctionObject(
                this,
                context.currentScope,
                context.functionPrototype,
                this.convertDocumentationToObject(context)
            )
        };
    }
}
