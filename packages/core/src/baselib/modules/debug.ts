import { assign, fun, id, jsFun } from "../../parser/astHelper";
import { Interpreter, InterpreterModule } from "../../runtime/interpreter";
import { SemanticFieldNames } from "../../runtime/semanticFieldNames";
import { DefaultModuleNames } from "../defaultModuleNames";
import { assertString } from "../typeHelpers";

/**
 * The debug module
 */
export const debugModule: InterpreterModule = {
    name: DefaultModuleNames.DEBUG,
    dependencies: [DefaultModuleNames.OBJECT, DefaultModuleNames.COMMON],
    expressions: [
        assign(
            "printlnInternal",
            jsFun(
                (args, context) => {
                    const value = args.getField(0, context);
                    const stringValue = assertString(value, "first argument of printlnInternal");
                    console.log(stringValue);
                    return context.null;
                },
                { docs: "Logs the first argument to the console, must be a string" }
            )
        ),
        assign(
            "println",
            fun([id("printlnInternal").call(id("toStr").call(id(SemanticFieldNames.ARGS).field(0)))], {
                docs: "Logs the first argument to the console"
            })
        )
    ]
};
