import { assign, jsFun } from "../../runtime/executableAstHelper.js";
import { InterpreterModule } from "../../runtime/interpreter/interpreterModule.js";
import { DefaultModuleNames } from "../defaultModuleNames.js";

/**
 * Wrapper (object) module
 * Adds support for wrapper objects
 */
export const reflectionModule = InterpreterModule.create(
    DefaultModuleNames.REFLECTION,
    [],
    [DefaultModuleNames.WRAPPER],
    [
        assign(
            "reflect",
            jsFun(
                (args, context) => {
                    const value = args.getSelfField(0, context);
                    if (value.source != undefined) {
                        return value.source.toWrapperObject(context);
                    } else {
                        return context.null;
                    }
                },
                {
                    docs: "Gets the source (AST) of the provided value",
                    params: [[0, "the value to get the AST source of"]],
                    returns: "the reflected value"
                }
            )
        )
    ]
);
