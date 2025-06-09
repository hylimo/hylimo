import type { FunctionExpression } from "../../ast/functionExpression.js";
import type { InterpreterContext } from "../interpreter/interpreterContext.js";
import type { LabeledValue } from "../objects/labeledValue.js";
import { FunctionObject } from "../objects/functionObject.js";
import type { FunctionDocumentation } from "./executableAbstractFunctionExpression.js";
import { ExecutableAbstractFunctionExpression } from "./executableAbstractFunctionExpression.js";
import type { ExecutableExpression } from "./executableExpression.js";

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

    override evaluateInternal(context: InterpreterContext): LabeledValue {
        return {
            value: new FunctionObject(this, context.currentScope, this.convertDocumentationToObject(context)),
            source: undefined
        };
    }
}
