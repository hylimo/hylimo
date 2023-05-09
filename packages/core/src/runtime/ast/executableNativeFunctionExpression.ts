import { AbstractInvocationExpression } from "../../ast/abstractInvocationExpression";
import { InterpreterContext } from "../interpreter";
import { FieldEntry } from "../objects/baseObject";
import { FullObject } from "../objects/fullObject";
import { NativeFunctionObject } from "../objects/functionObject";
import { ExecutableAbstractFunctionExpression, FunctionDocumentation } from "./executableAbstractFunctionExpression";
import { ExecutableListEntry } from "./executableListEntry";

/**
 * Type for the callback of native functions
 */
export type NativeFunctionType = (
    args: ExecutableListEntry[],
    context: InterpreterContext,
    staticScope: FullObject,
    callExpression: AbstractInvocationExpression | undefined
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
    constructor(readonly callback: NativeFunctionType, documentation: FunctionDocumentation | undefined) {
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
