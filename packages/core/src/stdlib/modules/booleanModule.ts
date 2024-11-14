import { ExecutableNativeExpression } from "../../runtime/ast/executableNativeExpression.js";
import { assign, fun, id, jsFun, native } from "../../runtime/executableAstHelper.js";
import { InterpreterModule } from "../../runtime/interpreter/interpreterModule.js";
import { BooleanObject } from "../../runtime/objects/booleanObject.js";
import { FullObject } from "../../runtime/objects/fullObject.js";
import { SemanticFieldNames } from "../../runtime/semanticFieldNames.js";
import { booleanType } from "../../types/boolean.js";
import { DefaultModuleNames } from "../defaultModuleNames.js";
import { assertBoolean, assertSelfShortCircuitArguments } from "../typeHelpers.js";

/**
 * Name of the boolean proto object
 */
const booleanProto = "booleanProto";

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
                jsFun((args, context) => new BooleanObject(true, args.getFieldValue(0, context) as FullObject)).call(
                    id(booleanProto)
                )
            ),
            id(SemanticFieldNames.PROTO).assignField(
                "false",
                jsFun((args, context) => new BooleanObject(false, args.getFieldValue(0, context) as FullObject)).call(
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
                        docs: "Performs logical and (&&). Short circuit evaluation! If self is false, the positional argument is not evaluated",
                        params: [
                            [
                                SemanticFieldNames.SELF,
                                "the left side of the logical and, always evaluated",
                                booleanType
                            ],
                            [
                                0,
                                "the right side of the logical and, only evaluated if the left side is true",
                                booleanType
                            ]
                        ],
                        returns: "The result of the logical and"
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
                        docs: "Performs logical or (||). Short circuit evaluation! If self is true, the positional argument is not evaluated",
                        params: [
                            [SemanticFieldNames.SELF, "the left side of the logical or, always evaluated", booleanType],
                            [
                                0,
                                "the right side of the logical or, only evaluated if the left side is false",
                                booleanType
                            ]
                        ],
                        returns: "The result of the logical or"
                    }
                )
            ),
            id(booleanProto).assignField(
                "&",
                jsFun(
                    (args, context) => {
                        return context.newBoolean(
                            assertBoolean(args.getFieldValue(SemanticFieldNames.SELF, context)) &&
                                assertBoolean(args.getFieldValue(0, context))
                        );
                    },
                    {
                        docs: "Performs logical and (&&) WITHOUT short circuit evaluation! The second argument is always evaluated",
                        params: [
                            [SemanticFieldNames.SELF, "the left side of the logical and", booleanType],
                            [0, "the right side of the logical and", booleanType]
                        ],
                        returns: "The result of the logical and"
                    }
                )
            ),
            id(booleanProto).assignField(
                "|",
                jsFun(
                    (args, context) => {
                        return context.newBoolean(
                            assertBoolean(args.getFieldValue(SemanticFieldNames.SELF, context)) ||
                                assertBoolean(args.getFieldValue(0, context))
                        );
                    },
                    {
                        docs: "Performs logical or (||) WITHOUT short circuit evaluation! The second argument is always evaluated",
                        params: [
                            [SemanticFieldNames.SELF, "the left side of the logical or", booleanType],
                            [0, "the right side of the logical or", booleanType]
                        ],
                        returns: "The result of the logical or"
                    }
                )
            ),
            id(booleanProto).assignField(
                "<",
                jsFun(
                    (args, context) => {
                        return context.newBoolean(
                            assertBoolean(args.getFieldValue(SemanticFieldNames.SELF, context)) <
                                assertBoolean(args.getFieldValue(0, context))
                        );
                    },
                    {
                        docs: "Performs '<' comparison of two booleans",
                        params: [
                            [
                                SemanticFieldNames.SELF,
                                "the left side of the comparison, must be a boolean",
                                booleanType
                            ],
                            [0, "the right side of the comparison, must be a boolean", booleanType]
                        ],
                        returns: "true if the left side is less than the right side"
                    }
                )
            ),
            id(booleanProto).assignField(
                ">",
                jsFun(
                    (args, context) => {
                        return context.newBoolean(
                            assertBoolean(args.getFieldValue(SemanticFieldNames.SELF, context)) >
                                assertBoolean(args.getFieldValue(0, context))
                        );
                    },
                    {
                        docs: "Performs '>' comparison of two booleans",
                        params: [
                            [
                                SemanticFieldNames.SELF,
                                "the left side of the comparison, must be a boolean",
                                booleanType
                            ],
                            [0, "the right side of the comparison, must be a boolean", booleanType]
                        ],
                        returns: "true if the left side is greater than the right side"
                    }
                )
            ),
            id(booleanProto).assignField(
                "<=",
                jsFun(
                    (args, context) => {
                        return context.newBoolean(
                            assertBoolean(args.getFieldValue(SemanticFieldNames.SELF, context)) <=
                                assertBoolean(args.getFieldValue(0, context))
                        );
                    },
                    {
                        docs: "Performs '<=' comparison of two booleans",
                        params: [
                            [
                                SemanticFieldNames.SELF,
                                "the left side of the comparison, must be a boolean",
                                booleanType
                            ],
                            [0, "the right side of the comparison, must be a boolean", booleanType]
                        ],
                        returns: "true if the left side is less than or equal to the right side"
                    }
                )
            ),
            id(booleanProto).assignField(
                ">=",
                jsFun(
                    (args, context) => {
                        return context.newBoolean(
                            assertBoolean(args.getFieldValue(SemanticFieldNames.SELF, context)) >=
                                assertBoolean(args.getFieldValue(0, context))
                        );
                    },
                    {
                        docs: "Performs '>=' comparison of two booleans",
                        params: [
                            [
                                SemanticFieldNames.SELF,
                                "the left side of the comparison, must be a boolean",
                                booleanType
                            ],
                            [0, "the right side of the comparison, must be a boolean", booleanType]
                        ],
                        returns: "true if the left side is greater than or equal to the right side"
                    }
                )
            )
        ]).call(),
        assign(
            "!",
            jsFun(
                (args, context) => {
                    return context.newBoolean(!assertBoolean(args.getFieldValue(0, context)));
                },
                {
                    docs: "Negates a boolean",
                    params: [[0, "the boolean to negate", booleanType]],
                    returns: "The negated argument"
                }
            )
        )
    ]
);
