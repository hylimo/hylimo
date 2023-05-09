import { assign, fun, id, jsFun } from "../../runtime/executableAstHelper";
import { InterpreterModule } from "../../runtime/interpreter";
import { SemanticFieldNames } from "../../runtime/semanticFieldNames";
import { stringType } from "../../types/string";
import { DefaultModuleNames } from "../defaultModuleNames";
import { assertString } from "../typeHelpers";

/**
 * Debug module
 * Adds println support which logs to console
 */
export const debugModule = InterpreterModule.create(
    DefaultModuleNames.DEBUG,
    [],
    [DefaultModuleNames.COMMON],
    [
        assign(
            "rawPrintln",
            jsFun(
                (args, context) => {
                    const value = args.getField(0, context);
                    const stringValue = assertString(value);
                    // eslint-disable-next-line no-console
                    console.log(stringValue);
                    return context.null;
                },
                {
                    docs: "Logs the first argument to the console, must be a string",
                    params: [[0, "the string to log to the console", stringType]],
                    returns: "null"
                }
            )
        ),
        assign(
            "println",
            fun([id("rawPrintln").call(id("toStr").call(id(SemanticFieldNames.ARGS).field(0)))], {
                docs: "Transforms the first argument to a string and logs it to the console",
                params: [[0, "the input to log"]],
                returns: "null"
            })
        )
    ]
);
