import { NativeFunctionExpression } from "../../ast/ast";
import { InterpreterContext } from "../interpreter";
import { FieldEntry } from "../objects/baseObject";
import { NativeFunctionObject } from "../objects/functionObject";
import { ExecutableAbstractFunctionExpression } from "./executableAbstractFunctionExpression";

/**
 * Exeutable NativeFunctionExpression
 */
export class ExecutableNativeFunctionExpression extends ExecutableAbstractFunctionExpression<NativeFunctionExpression> {
    override evaluateInternal(context: InterpreterContext): FieldEntry {
        return { value: new NativeFunctionObject(this, context.currentScope, context.nativeFunctionPrototype) };
    }
}
