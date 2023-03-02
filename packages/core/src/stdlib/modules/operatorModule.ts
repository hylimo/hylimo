import { fun, id, jsFun, native } from "../../parser/astHelper";
import { ExecutableConstExpression } from "../../runtime/ast/executableConstExpression";
import { InterpreterModule } from "../../runtime/interpreter";
import { RuntimeError } from "../../runtime/runtimeError";
import { SemanticFieldNames } from "../../runtime/semanticFieldNames";
import { DefaultModuleNames } from "../defaultModuleNames";
import { assertNumber, isString } from "../typeHelpers";
import { toBoolean } from "./booleanModule";

/**
 * Operator module
 * Adds operators which delegate the call to the first argument
 */
export const operatorModule = InterpreterModule.create(
    DefaultModuleNames.OPERATOR,
    [],
    [DefaultModuleNames.BOOLEAN],
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
                                    { name: SemanticFieldNames.SELF, value: ExecutableConstExpression.of(target) }
                                ],
                                context
                            );
                    },
                    {
                        docs: `
                            The ${operator} operator, expects two arguments, calls ${operator} on the first 
                            argument with the second argument.
                            Params:
                                - 0: the target where ${operator} is invoked
                                - 1: the value passed to the ${operator} function
                            Returns:
                                The result of the invocation of ${operator} on the first argument
                        `
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
                    if (first.value === context.null) {
                        return toBoolean(second.value === context.null, context);
                    } else {
                        return first.value
                            .getField("==", context)
                            .invoke(
                                [
                                    { name: SemanticFieldNames.SELF, value: ExecutableConstExpression.of(first) },
                                    { value: ExecutableConstExpression.of(second) }
                                ],
                                context
                            );
                    }
                },
                {
                    docs: `
                        Equality operator. If first argument is null, returns true iff second argument is null.
                        Otherwise calls == on the first argument with the second argument.
                        Params:
                            - 0: the left side of the == operator
                            - 1: the right side of the == operator
                        Returns:
                            The result of the comparison, if the left side is null guaranteed a boolean, otherwise
                            the result of the invokedc function.
                    `
                }
            )
        ),
        id(SemanticFieldNames.THIS).assignField(
            "!=",
            fun(
                [
                    id("!").call(
                        id("==").call(id(SemanticFieldNames.ARGS).field(0), id(SemanticFieldNames.ARGS).field(1))
                    )
                ],
                {
                    docs: `
                        Unequality operator, negates the result of the equality operator
                        Params:
                            - 0: the left side of the != operator
                            - 1: the right side of the != operator
                        Returns:
                            The negated result of the == operator
                    `
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
                            .getField("toStr")
                            .invoke([{ value: ExecutableConstExpression.of(second) }], context);
                    } else if (isString(second.value) && !isString(first.value)) {
                        first = context
                            .getField("toStr")
                            .invoke([{ value: ExecutableConstExpression.of(first) }], context);
                    }
                    return first.value
                        .getField("+", context)
                        .invoke(
                            [
                                { name: SemanticFieldNames.SELF, value: ExecutableConstExpression.of(first) },
                                { value: ExecutableConstExpression.of(second) }
                            ],
                            context
                        );
                },
                {
                    docs: `
                        The + operator, expects two arguments, calls + on the first 
                        argument with the second argument.
                        If any of the two arguments is a string, implicitely converts the other to a string.
                        Params:
                            - 0: the target where + is invoked
                            - 1: the value passed to the + function
                        Returns:
                            The result of the invocation of + on the first argument
                    `
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
                    if (leftSide.value === context.null) {
                        return args[1].value.evaluateWithSource(context);
                    } else {
                        return leftSide;
                    }
                },
                {
                    docs: `
                        The ?? operator, expects two arguments, returns the second argument if the first
                        argument is null, otherwise returns the first argument.
                        Evaluates the second argument only if the first is null.
                        Params:
                            - 0: the first argument, returned if not null
                            - 1: the second argument, returned if the first is null
                        Returns:
                            The second argument if the first is null, otherwise the first
                    `
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
                                    { name: SemanticFieldNames.SELF, value: ExecutableConstExpression.of(target) }
                                ],
                                context
                            );
                    } else {
                        const value = assertNumber(target.value, "first and only argument of -");
                        return { value: context.newNumber(-value) };
                    }
                },
                {
                    docs: `
                        The - operator / function, expects one two arguments.
                        If two are given, calls - on the first argument with the second argument.
                        If one is given, negates the argument.
                        Params:
                            - 0: the target where - is invoked or if one argument the value to negate
                            - 1: optional value passed to the - function
                        Returns:
                            The result of the invocation of - on the first argument or the negation result
                    `
                }
            )
        )
    ]
);
