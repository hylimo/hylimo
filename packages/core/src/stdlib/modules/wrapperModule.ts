import { ExecutableNativeExpression } from "../../runtime/ast/executableNativeExpression.js";
import { assign, fun } from "../../runtime/executableAstHelper.js";
import { InterpreterModule } from "../../runtime/interpreter/interpreterModule.js";
import { DefaultModuleNames } from "../defaultModuleNames.js";

/**
 * Name of the wrapper object proto object
 */
const wrapperProto = "wrapperProto";

/**
 * Wrapper (object) module
 * Adds support for wrapper objects
 */
export const wrapperModule = InterpreterModule.create(
    DefaultModuleNames.WRAPPER,
    [],
    [DefaultModuleNames.COMMON],
    [
        fun([
            assign(wrapperProto, new ExecutableNativeExpression((context) => ({ value: context.wrapperPrototype })))
        ]).call()
    ]
);
