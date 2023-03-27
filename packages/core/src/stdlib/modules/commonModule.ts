import { assign, fun, id, jsFun, str } from "../../runtime/executableAstHelper";
import { InterpreterModule } from "../../runtime/interpreter";
import { FieldEntry } from "../../runtime/objects/baseObject";
import { RuntimeError } from "../../runtime/runtimeError";
import { SemanticFieldNames } from "../../runtime/semanticFieldNames";
import { booleanType } from "../../types/boolean";
import { functionType } from "../../types/function";
import { optional } from "../../types/null";
import { numberType } from "../../types/number";
import { stringType } from "../../types/string";
import { DefaultModuleNames } from "../defaultModuleNames";
import { assertFunction, assertString } from "../typeHelpers";
import { assertBoolean } from "./booleanModule";

/**
 * Common module
 * Adds support for null, isNull, and common control flow structures (if, while)
 */
export const commonModule = InterpreterModule.create(
    DefaultModuleNames.COMMON,
    [],
    [DefaultModuleNames.BOOLEAN, DefaultModuleNames.OPERATOR, DefaultModuleNames.LIST],
    [
        assign("null", jsFun((_, context) => context.null).call()),
        assign(
            "if",
            jsFun(
                (args, context) => {
                    if (assertBoolean(args.getField(0, context))) {
                        const ifBranch = args.getField(1, context);
                        assertFunction(ifBranch);
                        return ifBranch.invoke([], context);
                    } else {
                        const elseBranch = args.getField(2, context);
                        if (elseBranch.isNull) {
                            return context.null;
                        } else {
                            assertFunction(elseBranch);
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
                    `,
                    snippet: "($1) {\n    $2\n}"
                },
                [
                    [0, booleanType],
                    [1, functionType],
                    [2, optional(functionType)]
                ]
            )
        ),
        assign(
            "while",
            jsFun(
                (args, context) => {
                    const condition = args.getField(0, context);
                    const body = args.getField(1, context);
                    assertFunction(condition);
                    assertFunction(body);
                    let lastValue: FieldEntry = { value: context.null };
                    // eslint-disable-next-line no-constant-condition
                    while (true) {
                        const conditionRes = condition.invoke([], context).value;
                        if (!assertBoolean(conditionRes, "result of the condition function")) {
                            break;
                        }
                        lastValue = body.invoke([], context);
                    }
                    return lastValue;
                },
                {
                    docs: `
                        While control flow statement.
                        Params:
                            - 0: the condition function, executed before each loop, must return a boolean
                            - 1: the body function, executed on each loop
                        Returns:
                            The result of the last loop iteration or null if the loop was never executed.
                    `,
                    snippet: " { $1 } {\n    $2\n}"
                },
                [
                    [0, functionType],
                    [1, functionType]
                ]
            )
        ),
        assign(
            "toStr",
            fun(
                [
                    assign("_value", id(SemanticFieldNames.ARGS).field(0)),
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
                    throw new RuntimeError(assertString(args.getField(0, context)));
                },
                {
                    docs: `
                        Throws an error with the specified message.
                        Params:
                            - 0: the error message, must be a string
                    `
                },
                [[0, stringType]]
            )
        ),
        assign(
            "range",
            fun(
                `
                    (n, step) = args
                    step = step ?? 1
                    res = list()
                    i = 0
                    while { i < n } {
                        res.add(i)
                        i = i + step
                    }
                    res
                `,
                {
                    docs: `
                        Generates a list with a range of numbers from 0 up to
                        n with n < the first parameter.
                        Params:
                            - 0: the max value
                            - 1: optional step size, defaults to 1
                        Returns:
                            A list with the generated numbers
                    `
                },
                [
                    [0, numberType],
                    [1, optional(numberType)]
                ]
            )
        )
    ]
);
