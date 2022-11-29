import { ConstExpression } from "../../parser/ast";
import { assign, fun, id, jsFun, native } from "../../parser/astHelper";
import { InterpreterModule } from "../../runtime/interpreter";
import { RuntimeError } from "../../runtime/runtimeError";
import { SemanticFieldNames } from "../../runtime/semanticFieldNames";
import { DefaultModuleNames } from "../defaultModuleNames";
import { isString } from "../typeHelpers";
import { toBoolean } from "./boolean";

/**
 * Operator module
 * Adds operators which delegate the call to the first argument
 */
export const operatorModule: InterpreterModule = {
    name: DefaultModuleNames.OPERATOR,
    dependencies: [],
    runtimeDependencies: [DefaultModuleNames.BOOLEAN],
    expressions: [
        ...["-", "*", "/", "%", "&&", "||", ">", ">=", "<", "<=", ">>", "<<"].map((operator) =>
            assign(
                operator,
                native(
                    (args, context) => {
                        if (args.length != 2 || args[0].name !== undefined || args[1].name !== undefined) {
                            throw new RuntimeError(`Expected exactly two positional arguments for ${operator}`);
                        }
                        const target = args[0].value.evaluateWithSource(context);
                        return target.value
                            .getField(operator, context)
                            .invoke(
                                [args[1], { name: SemanticFieldNames.SELF, value: new ConstExpression(target) }],
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
                                The result of the invokation of ${operator} on the first argument
                        `
                    }
                )
            )
        ),
        assign(
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
                                    { name: SemanticFieldNames.SELF, value: new ConstExpression(first) },
                                    { value: new ConstExpression(second) }
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
        assign(
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
        assign(
            "+",
            jsFun(
                (args, context) => {
                    let first = args.getFieldEntry(0, context);
                    let second = args.getFieldEntry(1, context);
                    if (isString(first.value) && !isString(second.value)) {
                        second = context.getField("toStr").invoke([{ value: new ConstExpression(second) }], context);
                    } else if (isString(second.value) && !isString(first.value)) {
                        first = context.getField("toStr").invoke([{ value: new ConstExpression(first) }], context);
                    }
                    return first.value
                        .getField("+", context)
                        .invoke(
                            [
                                { name: SemanticFieldNames.SELF, value: new ConstExpression(first) },
                                { value: new ConstExpression(second) }
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
                            The result of the invokation of + on the first argument
                    `
                }
            )
        )
    ]
};
