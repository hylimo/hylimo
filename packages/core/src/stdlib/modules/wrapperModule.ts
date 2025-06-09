import { assign, jsFun } from "../../runtime/executableAstHelper.js";
import { InterpreterModule } from "../../runtime/interpreter/interpreterModule.js";
import { DefaultModuleNames } from "../defaultModuleNames.js";
import { isWrapperObject } from "../typeHelpers.js";

/**
 * Wrapper (object) module
 * Adds support for wrapper objects
 */
export const wrapperModule = InterpreterModule.create(
    DefaultModuleNames.WRAPPER,
    [],
    [DefaultModuleNames.COMMON],
    [
        assign(
            "isWrapperObject",
            jsFun(
                (args, context) => {
                    return context.newBoolean(isWrapperObject(args.getSelfFieldValue(0, context)));
                },
                {
                    docs: "Checks if the provided value is a wrapper object.",
                    params: [[0, "the value to check"]],
                    returns: "true if the value is a wrapper object"
                }
            )
        )
    ]
);
