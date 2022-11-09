import { assign, fun, id, jsFun } from "../../parser/astHelper";
import { Interpreter, InterpreterModule } from "../../runtime/interpreter";
import { SemanticFieldNames } from "../../runtime/semanticFieldNames";
import { DefaultModuleNames } from "../defaultModuleNames";
import { assertString } from "../typeHelpers";

/**
 * Debug module
 * Adds println support which logs to console
 */
export const debugModule: InterpreterModule = {
    name: DefaultModuleNames.DEBUG,
    dependencies: [DefaultModuleNames.OBJECT, DefaultModuleNames.COMMON],
    expressions: [
        assign(
            "rawPrintln",
            jsFun(
                (args, context) => {
                    const value = args.getField(0, context);
                    const stringValue = assertString(value, "first argument of rawPrintln");
                    console.log(stringValue);
                    return context.null;
                },
                {
                    docs: `
                        Logs the first argument to the console, must be a string
                        Params:
                            - 0: the string to log to the console
                        Returns:
                            null
                    `
                }
            )
        ),
        assign(
            "println",
            fun([id("rawPrintln").call(id("toStr").call(id(SemanticFieldNames.ARGS).field(0)))], {
                docs: `
                    Transforms the first argument to a string and logs it to the console
                    Params:
                        - 0: the input to log
                    Returns:
                        null
                `
            })
        )
    ]
};
