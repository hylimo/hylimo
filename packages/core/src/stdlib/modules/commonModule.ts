import { FunctionExpression } from "../../ast/functionExpression.js";
import { ExecutableConstExpression } from "../../runtime/ast/executableConstExpression.js";
import { assign, jsFun, native } from "../../runtime/executableAstHelper.js";
import { InterpreterModule } from "../../runtime/interpreter.js";
import { FieldEntry } from "../../runtime/objects/baseObject.js";
import { RuntimeError } from "../../runtime/runtimeError.js";
import { SemanticFieldNames } from "../../runtime/semanticFieldNames.js";
import { booleanType } from "../../types/boolean.js";
import { functionType } from "../../types/function.js";
import { optional } from "../../types/null.js";
import { stringType } from "../../types/string.js";
import { DefaultModuleNames } from "../defaultModuleNames.js";
import { assertBoolean, assertFunction, assertString } from "../typeHelpers.js";

/**
 * Common module
 * Adds support for null, isNull, and common control flow structures (if, while)
 */
export const commonModule = InterpreterModule.create(
    DefaultModuleNames.COMMON,
    [],
    [
        DefaultModuleNames.BOOLEAN,
        DefaultModuleNames.NUMBER,
        DefaultModuleNames.STRING,
        DefaultModuleNames.OBJECT,
        DefaultModuleNames.FUNCTION
    ],
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
                    docs: "If control flow statement.",
                    params: [
                        [0, "boolean which decides if the second or third argument is executed", booleanType],
                        [1, "a function which is called if the first argument is true", functionType],
                        [
                            2,
                            "optional, if present must be a function which is called if the first argument is false",
                            optional(functionType)
                        ]
                    ],
                    returns: "If a function was called, the result of the function. Otherwise null"
                }
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
                    docs: "While control flow statement.",
                    params: [
                        [0, "the condition function, executed before each loop, must return a boolean", functionType],
                        [1, "the body function, executed on each loop", functionType]
                    ],
                    returns: "The result of the last loop iteration or null if the loop was never executed.",
                    snippet: " { $1 } {\n    $2\n}"
                }
            )
        ),
        assign(
            "toStr",
            jsFun(
                (args, context) => {
                    const value = args.getFieldEntry(0, context);
                    if (value.value.isNull) {
                        return context.newString("null");
                    } else {
                        const toString = value.value.getField("toString", context);
                        return toString.invoke(
                            [
                                {
                                    name: SemanticFieldNames.SELF,
                                    value: new ExecutableConstExpression(value)
                                }
                            ],
                            context
                        );
                    }
                },
                {
                    docs: "Transforms the input to a string and returns it. If the input is null, returns null directly, otherwise calls toString on the input",
                    params: [[0, "the input to transform"]],
                    returns: "The string representation"
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
                    docs: "Throws an error with the specified message.",
                    params: [[0, "the error message, must be a string", stringType]],
                    returns: "The return value"
                }
            )
        ),
        assign(
            "noedit",
            native(
                (args, context) => {
                    const argsToEdit = args.filter((arg) => arg.name !== SemanticFieldNames.SELF);
                    if (argsToEdit.length !== 1) {
                        throw new RuntimeError("noedit must be called with exactly one argument");
                    }
                    const fun = argsToEdit[0].value;
                    const expression = fun.expression;
                    if (!(expression instanceof FunctionExpression)) {
                        throw new RuntimeError("noedit must be called with a function expression");
                    }
                    expression.markNoEdit();
                    return fun.evaluate(context).value.invoke([], context);
                },
                {
                    docs: "Must be called with a single function expression, which is created locally. Marks the function as not editable recursively, and executes the function immediately, returning its result.",
                    params: [[0, "the function to execute"]],
                    returns: "The return value of the function"
                }
            )
        )
    ]
);
