import { AbstractInvocationExpression } from "../../ast/abstractInvocationExpression.js";
import { OperatorExpression } from "../../ast/operatorExpression.js";
import { InterpreterContext } from "../interpreter/interpreterContext.js";
import { FieldEntry } from "../objects/baseObject.js";
import { FullObject } from "../objects/fullObject.js";
import { NativeFunctionObject } from "../objects/functionObject.js";
import { ExecutableAbstractFunctionExpression, FunctionDocumentation } from "./executableAbstractFunctionExpression.js";
import { ExecutableListEntry } from "./executableListEntry.js";

/**
 * Type for the callback of native functions
 */
export type NativeFunctionType = (
    args: ExecutableListEntry[],
    context: InterpreterContext,
    staticScope: FullObject,
    callExpression: AbstractInvocationExpression | OperatorExpression | undefined
) => FieldEntry;

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

    override evaluateInternal(context: InterpreterContext): FieldEntry {
        return {
            value: new NativeFunctionObject(
                this,
                context.currentScope,
                context.functionPrototype,
                this.convertDocumentationToObject(context)
            )
        };
    }
}
