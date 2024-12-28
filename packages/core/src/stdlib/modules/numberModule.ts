import { ExecutableNativeExpression } from "../../runtime/ast/executableNativeExpression.js";
import { assign, fun, id, jsFun } from "../../runtime/executableAstHelper.js";
import { InterpreterModule } from "../../runtime/interpreter/interpreterModule.js";
import { SemanticFieldNames } from "../../runtime/semanticFieldNames.js";
import { numberType } from "../../types/number.js";
import { DefaultModuleNames } from "../defaultModuleNames.js";
import { assertNumber } from "../typeHelpers.js";
import { listType } from "../../types/list.js";
import { or } from "../../types/or.js";

/**
 * Name of the temporary field where the number prototype is assigned
 */
const numberProto = "numberProto";

/**
 * Identifier for the math object
 */
const mathObject = "Math";

/**
 * Number module providing numerical operators (+, -, *, /, %, <, <=, >, >=, ==)
 */
export const numberModule = InterpreterModule.create(
    DefaultModuleNames.NUMBER,
    [DefaultModuleNames.OBJECT],
    [DefaultModuleNames.COMMON],
    [
        fun([
            assign(numberProto, new ExecutableNativeExpression((context) => ({ value: context.numberPrototype }))),
            id(numberProto).assignField(
                "+",
                jsFun(
                    (args, context) => {
                        return context.newNumber(
                            assertNumber(args.getFieldValue(SemanticFieldNames.SELF, context)) +
                                assertNumber(args.getFieldValue(0, context))
                        );
                    },
                    {
                        docs: "Performs addition of two numbers.",
                        params: [
                            [SemanticFieldNames.SELF, "the left side of the sum, must be a number", numberType],
                            [0, "the right side of the sum, must be a number", numberType]
                        ],
                        returns: "the sum of the two numbers"
                    }
                )
            ),
            id(numberProto).assignField(
                "-",
                jsFun(
                    (args, context) => {
                        return context.newNumber(
                            assertNumber(args.getFieldValue(SemanticFieldNames.SELF, context)) -
                                assertNumber(args.getFieldValue(0, context))
                        );
                    },
                    {
                        docs: "Calculates the difference of two numbers.",
                        params: [
                            [SemanticFieldNames.SELF, "the left side of the difference, must be a number", numberType],
                            [0, "the right side of the difference, must be a number", numberType]
                        ],
                        returns: "the difference of the two numbers"
                    }
                )
            ),
            id(numberProto).assignField(
                "*",
                jsFun(
                    (args, context) => {
                        return context.newNumber(
                            assertNumber(args.getFieldValue(SemanticFieldNames.SELF, context)) *
                                assertNumber(args.getFieldValue(0, context))
                        );
                    },
                    {
                        docs: "Calculates the product of two numbers.",
                        params: [
                            [SemanticFieldNames.SELF, "the left side of the product, must be a number", numberType],
                            [0, "the right side of the product, must be a number", numberType]
                        ],
                        returns: "the product of the two numbers"
                    }
                )
            ),
            id(numberProto).assignField(
                "/",
                jsFun(
                    (args, context) => {
                        return context.newNumber(
                            assertNumber(args.getFieldValue(SemanticFieldNames.SELF, context)) /
                                assertNumber(args.getFieldValue(0, context))
                        );
                    },
                    {
                        docs: "Calculates the quotient of two numbers.",
                        params: [
                            [SemanticFieldNames.SELF, "the left side of the quotient, must be a number", numberType],
                            [0, "the right side of the quotient, must be a number", numberType]
                        ],
                        returns: "the quotient of the two numbers"
                    }
                )
            ),
            id(numberProto).assignField(
                "%",
                jsFun(
                    (args, context) => {
                        return context.newNumber(
                            assertNumber(args.getFieldValue(SemanticFieldNames.SELF, context)) %
                                assertNumber(args.getFieldValue(0, context))
                        );
                    },
                    {
                        docs: "Calculates the modulus of two numbers.",
                        params: [
                            [SemanticFieldNames.SELF, "the left side of the modulus, must be a number", numberType],
                            [0, "the right side of the modulus, must be a number", numberType]
                        ],
                        returns: "the modulus of the two numbers"
                    }
                )
            ),
            id(numberProto).assignField(
                "<",
                jsFun(
                    (args, context) => {
                        return context.newBoolean(
                            assertNumber(args.getFieldValue(SemanticFieldNames.SELF, context)) <
                                assertNumber(args.getFieldValue(0, context))
                        );
                    },
                    {
                        docs: 'Performs "<" comparison of two numbers.',
                        params: [
                            [SemanticFieldNames.SELF, "the left side of the comparison, must be a number", numberType],
                            [0, "the right side of the comparison, must be a number", numberType]
                        ],
                        returns: "true if the left side is less than the right side"
                    }
                )
            ),
            id(numberProto).assignField(
                ">",
                jsFun(
                    (args, context) => {
                        return context.newBoolean(
                            assertNumber(args.getFieldValue(SemanticFieldNames.SELF, context)) >
                                assertNumber(args.getFieldValue(0, context))
                        );
                    },
                    {
                        docs: 'Performs ">" comparison of two numbers.',
                        params: [
                            [SemanticFieldNames.SELF, "the left side of the comparison, must be a number", numberType],
                            [0, "the right side of the comparison, must be a number", numberType]
                        ],
                        returns: "true if the left side is greater than the right side"
                    }
                )
            ),
            id(numberProto).assignField(
                "<=",
                jsFun(
                    (args, context) => {
                        return context.newBoolean(
                            assertNumber(args.getFieldValue(SemanticFieldNames.SELF, context)) <=
                                assertNumber(args.getFieldValue(0, context))
                        );
                    },
                    {
                        docs: 'Performs "<=" comparison of two numbers.',
                        params: [
                            [SemanticFieldNames.SELF, "the left side of the comparison, must be a number", numberType],
                            [0, "the right side of the comparison, must be a number", numberType]
                        ],
                        returns: "true if the left side is less than or equal to the right side"
                    }
                )
            ),
            id(numberProto).assignField(
                ">=",
                jsFun(
                    (args, context) => {
                        return context.newBoolean(
                            assertNumber(args.getFieldValue(SemanticFieldNames.SELF, context)) >=
                                assertNumber(args.getFieldValue(0, context))
                        );
                    },
                    {
                        docs: 'Performs ">=" comparison of two numbers.',
                        params: [
                            [SemanticFieldNames.SELF, "the left side of the comparison, must be a number", numberType],
                            [0, "the right side of the comparison, must be a number", numberType]
                        ],
                        returns: "true if the left side is greater than or equal to the right side"
                    }
                )
            )
        ]).call(),
        assign(
            mathObject,
            fun([
                id(SemanticFieldNames.THIS).assignField(mathObject, id("object").call()),
                id(mathObject).assignField(
                    "floor",
                    jsFun(
                        (args, context) => {
                            return context.newNumber(Math.floor(assertNumber(args.getFieldValue(0, context))));
                        },
                        {
                            docs: "Rounds a number down to the largest integer less than or equal to the provided value.",
                            params: [[0, "the number to round down", numberType]],
                            returns: "The floored number"
                        }
                    )
                ),
                id(mathObject).assignField(
                    "ceil",
                    jsFun(
                        (args, context) => {
                            return context.newNumber(Math.ceil(assertNumber(args.getFieldValue(0, context))));
                        },
                        {
                            docs: "Rounds a number up to the smallest integer greater than or equal to the provided value.",
                            params: [[0, "the number to round up", numberType]],
                            returns: "The ceiled number"
                        }
                    )
                ),
                id(mathObject).assignField(
                    "round",
                    jsFun(
                        (args, context) => {
                            return context.newNumber(Math.round(assertNumber(args.getFieldValue(0, context))));
                        },
                        {
                            docs: "Rounds a number to the nearest integer.",
                            params: [[0, "the number to round", numberType]],
                            returns: "The rounded number"
                        }
                    )
                ),
                id(mathObject).assignField(
                    "max",
                    jsFun(
                        (args, context) => {
                            return context.newNumber(
                                Math.max(
                                    assertNumber(args.getFieldValue(0, context)),
                                    assertNumber(args.getFieldValue(1, context))
                                )
                            );
                        },
                        {
                            docs: "Returns the maximum number of the two numbers",
                            params: [
                                [0, "the first number to compare", numberType],
                                [1, "the second number to compare", numberType]
                            ],
                            returns: "The maximum number of the given arguments"
                        }
                    )
                ),
                id(mathObject).assignField(
                    "min",
                    jsFun(
                        (args, context) => {
                            return context.newNumber(
                                Math.min(
                                    assertNumber(args.getFieldValue(0, context)),
                                    assertNumber(args.getFieldValue(1, context))
                                )
                            );
                        },
                        {
                            docs: "Returns the minimum number of the two numbers",
                            params: [
                                [0, "the first number to compare", numberType],
                                [1, "the second number to compare", numberType]
                            ],
                            returns: "The minimum number of the given arguments"
                        }
                    )
                ),
                id(mathObject)
            ]).call()
        )
    ]
);
