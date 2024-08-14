import { fun, id, jsFun, native } from "../../runtime/executableAstHelper.js";
import { ExecutableConstExpression } from "../../runtime/ast/executableConstExpression.js";
import { InterpreterModule } from "../../runtime/interpreter.js";
import { RuntimeError } from "../../runtime/runtimeError.js";
import { SemanticFieldNames } from "../../runtime/semanticFieldNames.js";
import { DefaultModuleNames } from "../defaultModuleNames.js";
import { assertNumber, isString } from "../typeHelpers.js";

/**
 * Operator module
 * Adds operators which delegate the call to the first argument
 */
export const operatorModule = InterpreterModule.create(
    DefaultModuleNames.OPERATOR,
    [],
    [DefaultModuleNames.COMMON],
    [
        ...["*", "/", "%", "&&", "||", ">", ">=", "<", "<=", ">>", "<<", "+="].map((operator) =>
            id(SemanticFieldNames.THIS).assignField(
                operator,
                native(
                    (args, context) => {
                        args.shift();
                        if (args.length != 2 || args[0].name !== undefined || args[1].name !== undefined) {
                            throw new RuntimeError(`Expected exactly two positional arguments for ${operator}`);
                        }
                        const target = args[0].value.evaluateWithSource(context);
                        return target.value
                            .getField(operator, context)
                            .invoke(
                                [
                                    args[1],
                                    { name: SemanticFieldNames.SELF, value: new ExecutableConstExpression(target) }
                                ],
                                context
                            );
                    },
                    {
                        docs: `The ${operator} operator, expects two arguments, calls ${operator} on the first argument with the second argument.`,
                        params: [
                            [0, `the target where ${operator} is invoked`],
                            [1, `the value passed to the ${operator} function`]
                        ],
                        returns: `The result of the invocation of ${operator} on the first argument`
                    }
                )
            )
        ),
        id(SemanticFieldNames.THIS).assignField(
            "==",
            jsFun(
                (args, context) => {
                    const first = args.getFieldEntry(0, context);
                    const second = args.getFieldEntry(1, context);
                    if (first.value.isNull) {
                        return context.newBoolean(second.value.isNull);
                    } else {
                        return first.value
                            .getField("==", context)
                            .invoke(
                                [
                                    { name: SemanticFieldNames.SELF, value: new ExecutableConstExpression(first) },
                                    { value: new ExecutableConstExpression(second) }
                                ],
                                context
                            );
                    }
                },
                {
                    docs: "Equality operator. If first argument is null, returns true iff second argument is null. Otherwise calls == on the first argument with the second argument.",
                    params: [
                        [0, "the left side of the == operator"],
                        [1, "the right side of the == operator"]
                    ],
                    returns:
                        "The result of the comparison, if the left side is null guaranteed a boolean, otherwise the result of the invokedc function."
                }
            )
        ),
        id(SemanticFieldNames.THIS).assignField(
            "!=",
            fun(
                `
                    (lhs, rhs) = args
                    !(lhs == rhs)
                `,
                {
                    docs: "Unequality operator, negates the result of the equality operator",
                    params: [
                        [0, "the left side of the != operator"],
                        [1, "the right side of the != operator"]
                    ],
                    returns: "The negated result of the == operator"
                }
            )
        ),
        id(SemanticFieldNames.THIS).assignField(
            "+",
            jsFun(
                (args, context) => {
                    let first = args.getFieldEntry(0, context);
                    let second = args.getFieldEntry(1, context);
                    if (isString(first.value) && !isString(second.value)) {
                        second = context
                            .getGlobalField("toStr")
                            .invoke([{ value: new ExecutableConstExpression(second) }], context);
                    } else if (isString(second.value) && !isString(first.value)) {
                        first = context
                            .getGlobalField("toStr")
                            .invoke([{ value: new ExecutableConstExpression(first) }], context);
                    }
                    return first.value
                        .getField("+", context)
                        .invoke(
                            [
                                { name: SemanticFieldNames.SELF, value: new ExecutableConstExpression(first) },
                                { value: new ExecutableConstExpression(second) }
                            ],
                            context
                        );
                },
                {
                    docs: "The + operator, expects two arguments, calls + on the first argument with the second argument. If any of the two arguments is a string, implicitely converts the other to a string.",
                    params: [
                        [0, "the target where + is invoked"],
                        [1, "the value passed to the + function"]
                    ],
                    returns: "The result of the invocation of + on the first argument"
                }
            )
        ),
        id(SemanticFieldNames.THIS).assignField(
            "??",
            native(
                (args, context) => {
                    args.shift();
                    if (args.length != 2 || args[0].name !== undefined || args[1].name !== undefined) {
                        throw new RuntimeError(`Expected exactly two positional arguments for ??}`);
                    }
                    const leftSide = args[0].value.evaluateWithSource(context);
                    if (leftSide.value.isNull) {
                        return args[1].value.evaluateWithSource(context);
                    } else {
                        return leftSide;
                    }
                },
                {
                    docs: "The ?? operator, expects two arguments, returns the second argument if the first argument is null, otherwise returns the first argument. Evaluates the second argument only if the first is null.",
                    params: [
                        [0, "the first argument, returned if not null"],
                        [1, "the second argument, returned if the first is null"]
                    ],
                    returns: "The second argument if the first is null, otherwise the first"
                }
            )
        ),
        id(SemanticFieldNames.THIS).assignField(
            "-",
            native(
                (args, context) => {
                    args.shift();
                    if (
                        args.length > 2 ||
                        args.length < 1 ||
                        args[0].name !== undefined ||
                        args[1]?.name !== undefined
                    ) {
                        throw new RuntimeError(`Expected exactly one or two positional arguments for -`);
                    }
                    const target = args[0].value.evaluateWithSource(context);
                    if (args.length == 2) {
                        return target.value
                            .getField("-", context)
                            .invoke(
                                [
                                    args[1],
                                    { name: SemanticFieldNames.SELF, value: new ExecutableConstExpression(target) }
                                ],
                                context
                            );
                    } else {
                        const value = assertNumber(target.value, "first and only argument of -");
                        return { value: context.newNumber(-value) };
                    }
                },
                {
                    docs: "The - operator / function, expects one two arguments. If two are given, calls - on the first argument with the second argument. If one is given, negates the argument.",
                    params: [
                        [0, "the target where - is invoked or if one argument the value to negate"],
                        [1, "optional value passed to the - function"]
                    ],
                    returns: "The result of the invocation of - on the first argument or the negation result"
                }
            )
        )
    ]
);
