import { AbstractInvocationExpression } from "../../ast/abstractInvocationExpression";
import { InterpreterContext } from "../interpreter";
import { FieldEntry } from "../objects/baseObject";
import { FullObject } from "../objects/fullObject";
import { NativeFunctionObject } from "../objects/functionObject";
import { ExecutableAbstractFunctionExpression } from "./executableAbstractFunctionExpression";
import { ExecutableInvocationArgument } from "./executableAbstractInvocationExpression";

/**
 * Type for the callback of native functions
 */
export type NativeFunctionType = (
    args: ExecutableInvocationArgument[],
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
     * @param decorator decorators of the function
     */
    constructor(readonly callback: NativeFunctionType, decorator: Map<string, string | undefined>) {
        super(undefined, decorator);
    }

    override evaluateInternal(context: InterpreterContext): FieldEntry {
        return { value: new NativeFunctionObject(this, context.currentScope, context.nativeFunctionPrototype) };
    }
}
