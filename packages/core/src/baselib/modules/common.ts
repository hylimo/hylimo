import { arg, assign, jsFun } from "../../parser/astHelper";
import { InterpreterModule } from "../../runtime/interpreter";
import { DefaultModuleNames } from "../defaultModuleNames";
import { assertFunction } from "../typeHelpers";
import { assertBoolean } from "./boolean";

/**
 * Common module
 * Adds support for null, isNull, and common control flow structures (if, while)
 */
export const commonModule: InterpreterModule = {
    name: DefaultModuleNames.COMMON,
    dependencies: [DefaultModuleNames.BOOLEAN],
    expressions: [
        assign("null", jsFun((_, context) => context.null).call()),
        assign(
            "isNull",
            jsFun(
                (args, context) => {
                    if (args.getField(0, context) === context.null) {
                        return context.getField("true");
                    } else {
                        return context.getField("false");
                    }
                },
                {
                    docs: `
                        Checks if the first argument is null
                        Params:
                            - 0: input to check for equality with null
                        Returns:
                            true if the first argument is null, otherwise false
                    `
                }
            )
        ),
        assign(
            "if",
            jsFun(
                (args, context) => {
                    if (assertBoolean(args.getField(0, context), "first argument of if")) {
                        const ifBranch = args.getField(1, context);
                        assertFunction(ifBranch, "second argument of if");
                        return ifBranch.invoke([], context);
                    } else {
                        const elseBranch = args.getField(2, context);
                        if (elseBranch === context.null) {
                            return context.null;
                        } else {
                            assertFunction(elseBranch, "third argument of if");
                            return elseBranch.invoke([], context);
                        }
                    }
                },
                {
                    docs: `
                        If control flow statement.
                        Params:
                            - 0: boolean which decides if the second or third argument is executed
                            - 1: a function which is called if the first argument is true
                            - 2: optional, if present must be a function which is called if the first argument is false
                        Returns:
                            If a function was called, the result of the function. Otherwise null
                    `
                }
            )
        )
    ]
};
