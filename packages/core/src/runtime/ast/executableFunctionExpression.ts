import { FunctionExpression } from "../../ast/functionExpression.js";
import { InterpreterContext } from "../interpreter/interpreterContext.js";
import { FieldEntry } from "../objects/baseObject.js";
import { FunctionObject } from "../objects/functionObject.js";
import { ExecutableAbstractFunctionExpression, FunctionDocumentation } from "./executableAbstractFunctionExpression.js";
import { ExecutableExpression } from "./executableExpression.js";

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
