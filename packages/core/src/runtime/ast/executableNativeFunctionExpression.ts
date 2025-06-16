import type { AbstractInvocationExpression } from "../../ast/abstractInvocationExpression.js";
import type { OperatorExpression } from "../../ast/operatorExpression.js";
import type { InterpreterContext } from "../interpreter/interpreterContext.js";
import type { LabeledValue } from "../objects/labeledValue.js";
import type { FullObject } from "../objects/fullObject.js";
import { NativeFunctionObject } from "../objects/functionObject.js";
import type { FunctionDocumentation } from "./executableAbstractFunctionExpression.js";
import { ExecutableAbstractFunctionExpression } from "./executableAbstractFunctionExpression.js";
import type { ExecutableListEntry } from "./executableListEntry.js";

/**
 * Type for the callback of native functions
 */
export type NativeFunctionType = (
    args: ExecutableListEntry[],
    context: InterpreterContext,
    staticScope: FullObject,
    callExpression: AbstractInvocationExpression | OperatorExpression | undefined
) => LabeledValue;

/**
 * Exeutable NativeFunctionExpression
 */
export class ExecutableNativeFunctionExpression extends ExecutableAbstractFunctionExpression {
    /**
     * Creats a new ExecutableNativeFunctionExpression
     *
     * @param callback the callback to call when the function is invoked
     * @param documentation the documentation of the function
     */
    constructor(
        readonly callback: NativeFunctionType,
        documentation: FunctionDocumentation | undefined
    ) {
        super(undefined, documentation);
    }

    override evaluateInternal(context: InterpreterContext): LabeledValue {
        return {
            value: new NativeFunctionObject(this, context.currentScope, this.convertDocumentationToObject(context)),
            source: undefined
        };
    }
}
