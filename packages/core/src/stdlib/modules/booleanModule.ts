import { ExecutableNativeExpression } from "../../runtime/ast/executableNativeExpression";
import { assign, fun, id, jsFun, native } from "../../runtime/executableAstHelper";
import { InterpreterModule } from "../../runtime/interpreter";
import { BooleanObject } from "../../runtime/objects/booleanObject";
import { FullObject } from "../../runtime/objects/fullObject";
import { SemanticFieldNames } from "../../runtime/semanticFieldNames";
import { Type } from "../../types/base";
import { booleanType } from "../../types/boolean";
import { DefaultModuleNames } from "../defaultModuleNames";
import { assertBoolean, assertSelfShortCircuitArguments } from "../typeHelpers";

/**
 * Name of the boolean proto object
 */
const booleanProto = "booleanProto";

/**
 * Type for boolean operator functions
 */
const booleanOperatorFunctionTypes: [string | number, Type][] = [
    [0, booleanType],
    [SemanticFieldNames.SELF, booleanType]
];

/**
 * Boolean module
 * Adds support for booleans
 */
export const booleanModule = InterpreterModule.create(
    DefaultModuleNames.BOOLEAN,
    [],
    [DefaultModuleNames.COMMON],
    [
        fun([
            assign(booleanProto, new ExecutableNativeExpression((context) => ({ value: context.booleanPrototype }))),
            id(SemanticFieldNames.PROTO).assignField(
                "true",
                jsFun((args, context) => new BooleanObject(true, args.getField(0, context) as FullObject)).call(
                    id(booleanProto)
                )
            ),
            id(SemanticFieldNames.PROTO).assignField(
                "false",
                jsFun((args, context) => new BooleanObject(false, args.getField(0, context) as FullObject)).call(
                    id(booleanProto)
                )
            ),
            id(booleanProto).assignField(
                "&&",
                native(
                    (args, context) => {
                        const [first, second] = assertSelfShortCircuitArguments(args, "&&");
                        return {
                            value: context.newBoolean(
                                assertBoolean(first.evaluate(context).value, "left side of &&") &&
                                    assertBoolean(second.evaluate(context).value, "right side of &&")
                            )
                        };
                    },
                    {
                        docs: `
                            Performs logical and (&&).
                            Short circuit evaluation! If self is false, the positional argument is not evaluated
                            Params:
                                - "self": the left side of the logical and, always evaluated
                                - 0: the right side of the logical and, only evaluated if the left side is true
                            Returns:
                                The result of the logical and
                        `
                    }
                )
            ),
            id(booleanProto).assignField(
                "||",
                native(
                    (args, context) => {
                        const [first, second] = assertSelfShortCircuitArguments(args, "||");
                        return {
                            value: context.newBoolean(
                                assertBoolean(first.evaluate(context).value, "left side of ||") ||
                                    assertBoolean(second.evaluate(context).value, "right side of ||")
                            )
                        };
                    },
                    {
                        docs: `
                            Performs logical or (||).
                            Short circuit evaluation! If self is true, the positional argument is not evaluated
                            Params:
                                - "self": the left side of the logical or, always evaluated
                                - 0: the right side of the logical or, only evaluated if the left side is false
                            Returns:
                                The result of the logical or
                        `
                    }
                )
            ),
            id(booleanProto).assignField(
                "<",
                jsFun(
                    (args, context) => {
                        return context.newBoolean(
                            assertBoolean(args.getField(SemanticFieldNames.SELF, context)) <
                                assertBoolean(args.getField(0, context))
                        );
                    },
                    {
                        docs: `
                            Performs "<" comparison of two booleans.
                            Params:
                                - "self": the left side of the comparison, must be a boolean
                                - 0: the right side of the comparison, must be a boolean
                            Returns:
                                true if the left side is less than the right side
                        `
                    },
                    booleanOperatorFunctionTypes
                )
            ),
            id(booleanProto).assignField(
                ">",
                jsFun(
                    (args, context) => {
                        return context.newBoolean(
                            assertBoolean(args.getField(SemanticFieldNames.SELF, context)) >
                                assertBoolean(args.getField(0, context))
                        );
                    },
                    {
                        docs: `
                            Performs ">" comparison of two booleans.
                            Params:
                                - "self": the left side of the comparison, must be a boolean
                                - 0: the right side of the comparison, must be a boolean
                            Returns:
                                true if the left side is greater than the right side
                        `
                    },
                    booleanOperatorFunctionTypes
                )
            ),
            id(booleanProto).assignField(
                "<=",
                jsFun(
                    (args, context) => {
                        return context.newBoolean(
                            assertBoolean(args.getField(SemanticFieldNames.SELF, context)) <=
                                assertBoolean(args.getField(0, context))
                        );
                    },
                    {
                        docs: `
                            Performs "<=" comparison of two booleans.
                            Params:
                                - "self": the left side of the comparison, must be a boolean
                                - 0: the right side of the comparison, must be a boolean
                            Returns:
                                true if the left side is less than or equal to the right side
                        `
                    },
                    booleanOperatorFunctionTypes
                )
            ),
            id(booleanProto).assignField(
                ">=",
                jsFun(
                    (args, context) => {
                        return context.newBoolean(
                            assertBoolean(args.getField(SemanticFieldNames.SELF, context)) >=
                                assertBoolean(args.getField(0, context))
                        );
                    },
                    {
                        docs: `
                            Performs ">=" comparison of two booleans.
                            Params:
                                - "self": the left side of the comparison, must be a boolean
                                - 0: the right side of the comparison, must be a boolean
                            Returns:
                                true if the left side is greater than or equal to the right side
                        `
                    },
                    booleanOperatorFunctionTypes
                )
            ),
            id(booleanProto).assignField(
                "==",
                jsFun(
                    (args, context) => {
                        const self = assertBoolean(args.getField(SemanticFieldNames.SELF, context));
                        const other = args.getField(0, context);
                        let res: boolean;
                        if (other instanceof BooleanObject) {
                            res = self === other.value;
                        } else {
                            res = false;
                        }
                        return context.newBoolean(res);
                    },
                    {
                        docs: `
                            Compares self to another value, returns true if they are the same boolean.
                            Params:
                                - "self": a boolean to compare
                                - 0: other value for the comparison
                            Returns:
                                true iff both values are the same boolean
                        `
                    },
                    [[SemanticFieldNames.SELF, booleanType]]
                )
            )
        ]).call(),
        assign(
            "!",
            jsFun(
                (args, context) => {
                    return context.newBoolean(!assertBoolean(args.getField(0, context)));
                },
                {
                    docs: `
                        Negates a boolean
                        Params:
                            0: the boolean to negate
                        Returns:
                            The negated argument
                    `
                },
                [[0, booleanType]]
            )
        )
    ]
);
