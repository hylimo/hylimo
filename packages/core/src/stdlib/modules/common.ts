import { assign, fun, id, jsFun, str } from "../../parser/astHelper";
import { InterpreterModule } from "../../runtime/interpreter";
import { RuntimeError } from "../../runtime/runtimeError";
import { SemanticFieldNames } from "../../runtime/semanticFieldNames";
import { DefaultModuleNames } from "../defaultModuleNames";
import { assertFunction, assertString } from "../typeHelpers";
import { assertBoolean } from "./boolean";

/**
 * Common module
 * Adds support for null, isNull, and common control flow structures (if, while)
 */
export const commonModule: InterpreterModule = {
    name: DefaultModuleNames.COMMON,
    dependencies: [],
    runtimeDependencies: [DefaultModuleNames.BOOLEAN, DefaultModuleNames.OPERATOR],
    expressions: [
        assign("null", jsFun((_, context) => context.null).call()),
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
        ),
        assign(
            "while",
            jsFun(
                (args, context) => {
                    const condition = args.getField(0, context);
                    const body = args.getField(1, context);
                    assertFunction(condition, "first argument of while");
                    assertFunction(body, "second argument of while");
                    while (true) {
                        const conditionRes = condition.invoke([], context).value;
                        if (!assertBoolean(conditionRes, "result of the condition function")) {
                            break;
                        }
                        body.invoke([], context);
                    }
                    return context.null;
                },
                {
                    docs: `
                        While control flow statement.
                        Params:
                            - 0: the condition function, executed before each loop, must return a boolean
                            - 1: the body function, executed on each loop
                        Returns:
                            null
                    `
                }
            )
        ),
        assign(
            "toStr",
            fun(
                [
                    id(SemanticFieldNames.THIS).assignField("_value", id(SemanticFieldNames.ARGS).field(0)),
                    id("if").call(
                        id("==").call(id("null"), id("_value")),
                        fun([str("null")]),
                        fun([id("_value").callField("toString")])
                    )
                ],
                {
                    docs: `
                        Transforms the input to a string and returns it.
                        If the input is null, returns null directly, otherwise calls toString on the input
                        Params:
                            - 0: the input to transform
                        Returns:
                            The string representation
                    `
                }
            )
        ),
        assign(
            "error",
            jsFun(
                (args, context) => {
                    throw new RuntimeError(assertString(args.getField(0, context), "first argument of error"));
                },
                {
                    docs: `
                        Throws an error with the specified message.
                        Params:
                            - 0: the error message, must be a string
                    `
                }
            )
        )
    ]
};
