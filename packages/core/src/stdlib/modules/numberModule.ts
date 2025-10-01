import { ExecutableNativeExpression } from "../../runtime/ast/executableNativeExpression.js";
import { assign, fun, id, jsFun, num } from "../../runtime/executableAstHelper.js";
import { InterpreterModule } from "../../runtime/interpreter/interpreterModule.js";
import { SemanticFieldNames } from "../../runtime/semanticFieldNames.js";
import { numberType } from "../../types/number.js";
import { DefaultModuleNames } from "../defaultModuleNames.js";
import { assertNumber, isNumber } from "../typeHelpers.js";

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
            assign(
                numberProto,
                new ExecutableNativeExpression((context) => ({ value: context.numberPrototype, source: undefined }))
            ),
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
            "isNumber",
            jsFun(
                (args, context) => {
                    return context.newBoolean(isNumber(args.getFieldValue(0, context)));
                },
                {
                    docs: "Checks if the provided value is a number.",
                    params: [[0, "the value to check"]],
                    returns: "true if the value is a number"
                }
            )
        ),
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
                id(mathObject).assignField(
                    "sin",
                    jsFun(
                        (args, context) => {
                            return context.newNumber(Math.sin(assertNumber(args.getFieldValue(0, context))));
                        },
                        {
                            docs: "Returns the sine of the given angle (in radians)",
                            params: [[0, "the angle in radians", numberType]],
                            returns: "The sine of the given angle"
                        }
                    )
                ),
                id(mathObject).assignField(
                    "cos",
                    jsFun(
                        (args, context) => {
                            return context.newNumber(Math.cos(assertNumber(args.getFieldValue(0, context))));
                        },
                        {
                            docs: "Returns the cosine of the given angle (in radians)",
                            params: [[0, "the angle in radians", numberType]],
                            returns: "The cosine of the given angle"
                        }
                    )
                ),
                id(mathObject).assignField(
                    "tan",
                    jsFun(
                        (args, context) => {
                            return context.newNumber(Math.tan(assertNumber(args.getFieldValue(0, context))));
                        },
                        {
                            docs: "Returns the tangent of the given angle (in radians)",
                            params: [[0, "the angle in radians", numberType]],
                            returns: "The tangent of the given angle"
                        }
                    )
                ),
                id(mathObject).assignField(
                    "asin",
                    jsFun(
                        (args, context) => {
                            return context.newNumber(Math.asin(assertNumber(args.getFieldValue(0, context))));
                        },
                        {
                            docs: "Returns the arcsine (in radians) of the given number",
                            params: [[0, "a number between -1 and 1", numberType]],
                            returns: "The arcsine of the given number"
                        }
                    )
                ),
                id(mathObject).assignField(
                    "acos",
                    jsFun(
                        (args, context) => {
                            return context.newNumber(Math.acos(assertNumber(args.getFieldValue(0, context))));
                        },
                        {
                            docs: "Returns the arccosine (in radians) of the given number",
                            params: [[0, "a number between -1 and 1", numberType]],
                            returns: "The arccosine of the given number"
                        }
                    )
                ),
                id(mathObject).assignField(
                    "atan",
                    jsFun(
                        (args, context) => {
                            return context.newNumber(Math.atan(assertNumber(args.getFieldValue(0, context))));
                        },
                        {
                            docs: "Returns the arctangent (in radians) of the given number",
                            params: [[0, "a number", numberType]],
                            returns: "The arctangent of the given number"
                        }
                    )
                ),
                id(mathObject).assignField(
                    "atan2",
                    jsFun(
                        (args, context) => {
                            return context.newNumber(
                                Math.atan2(
                                    assertNumber(args.getFieldValue(0, context)),
                                    assertNumber(args.getFieldValue(1, context))
                                )
                            );
                        },
                        {
                            docs: "Returns the arctangent of the quotient y/x (in radians)",
                            params: [
                                [0, "the y coordinate", numberType],
                                [1, "the x coordinate", numberType]
                            ],
                            returns: "The angle (in radians) from the X axis to the point (x, y)"
                        }
                    )
                ),
                id(mathObject).assignField(
                    "sinh",
                    jsFun(
                        (args, context) => {
                            return context.newNumber(Math.sinh(assertNumber(args.getFieldValue(0, context))));
                        },
                        {
                            docs: "Returns the hyperbolic sine of the given number",
                            params: [[0, "a number", numberType]],
                            returns: "The hyperbolic sine of the given number"
                        }
                    )
                ),
                id(mathObject).assignField(
                    "cosh",
                    jsFun(
                        (args, context) => {
                            return context.newNumber(Math.cosh(assertNumber(args.getFieldValue(0, context))));
                        },
                        {
                            docs: "Returns the hyperbolic cosine of the given number",
                            params: [[0, "a number", numberType]],
                            returns: "The hyperbolic cosine of the given number"
                        }
                    )
                ),
                id(mathObject).assignField(
                    "tanh",
                    jsFun(
                        (args, context) => {
                            return context.newNumber(Math.tanh(assertNumber(args.getFieldValue(0, context))));
                        },
                        {
                            docs: "Returns the hyperbolic tangent of the given number",
                            params: [[0, "a number", numberType]],
                            returns: "The hyperbolic tangent of the given number"
                        }
                    )
                ),
                id(mathObject).assignField(
                    "asinh",
                    jsFun(
                        (args, context) => {
                            return context.newNumber(Math.asinh(assertNumber(args.getFieldValue(0, context))));
                        },
                        {
                            docs: "Returns the hyperbolic arcsine of the given number",
                            params: [[0, "a number", numberType]],
                            returns: "The hyperbolic arcsine of the given number"
                        }
                    )
                ),
                id(mathObject).assignField(
                    "acosh",
                    jsFun(
                        (args, context) => {
                            return context.newNumber(Math.acosh(assertNumber(args.getFieldValue(0, context))));
                        },
                        {
                            docs: "Returns the hyperbolic arccosine of the given number",
                            params: [[0, "a number greater than or equal to 1", numberType]],
                            returns: "The hyperbolic arccosine of the given number"
                        }
                    )
                ),
                id(mathObject).assignField(
                    "atanh",
                    jsFun(
                        (args, context) => {
                            return context.newNumber(Math.atanh(assertNumber(args.getFieldValue(0, context))));
                        },
                        {
                            docs: "Returns the hyperbolic arctangent of the given number",
                            params: [[0, "a number between -1 and 1", numberType]],
                            returns: "The hyperbolic arctangent of the given number"
                        }
                    )
                ),
                id(mathObject).assignField(
                    "hypot",
                    jsFun(
                        (args, context) => {
                            return context.newNumber(
                                Math.hypot(
                                    assertNumber(args.getFieldValue(0, context)),
                                    assertNumber(args.getFieldValue(1, context))
                                )
                            );
                        },
                        {
                            docs: "Returns the square root of the sum of squares of its arguments",
                            params: [
                                [0, "the first number", numberType],
                                [1, "the second number", numberType]
                            ],
                            returns: "The Euclidean norm (length of vector)"
                        }
                    )
                ),
                id(mathObject).assignField(
                    "cbrt",
                    jsFun(
                        (args, context) => {
                            return context.newNumber(Math.cbrt(assertNumber(args.getFieldValue(0, context))));
                        },
                        {
                            docs: "Returns the cube root of the given number",
                            params: [[0, "a number", numberType]],
                            returns: "The cube root of the given number"
                        }
                    )
                ),
                id(mathObject).assignField(
                    "sqrt",
                    jsFun(
                        (args, context) => {
                            return context.newNumber(Math.sqrt(assertNumber(args.getFieldValue(0, context))));
                        },
                        {
                            docs: "Returns the square root of the given number",
                            params: [[0, "a non-negative number", numberType]],
                            returns: "The square root of the given number"
                        }
                    )
                ),
                id(mathObject).assignField(
                    "pow",
                    jsFun(
                        (args, context) => {
                            return context.newNumber(
                                Math.pow(
                                    assertNumber(args.getFieldValue(0, context)),
                                    assertNumber(args.getFieldValue(1, context))
                                )
                            );
                        },
                        {
                            docs: "Returns the base raised to the exponent",
                            params: [
                                [0, "the base number", numberType],
                                [1, "the exponent", numberType]
                            ],
                            returns: "The result of base^exponent"
                        }
                    )
                ),
                id(mathObject).assignField(
                    "log",
                    jsFun(
                        (args, context) => {
                            return context.newNumber(Math.log(assertNumber(args.getFieldValue(0, context))));
                        },
                        {
                            docs: "Returns the natural logarithm (base e) of the given number",
                            params: [[0, "a positive number", numberType]],
                            returns: "The natural logarithm of the given number"
                        }
                    )
                ),
                id(mathObject).assignField(
                    "log2",
                    jsFun(
                        (args, context) => {
                            return context.newNumber(Math.log2(assertNumber(args.getFieldValue(0, context))));
                        },
                        {
                            docs: "Returns the base-2 logarithm of the given number",
                            params: [[0, "a positive number", numberType]],
                            returns: "The base-2 logarithm of the given number"
                        }
                    )
                ),
                id(mathObject).assignField(
                    "log10",
                    jsFun(
                        (args, context) => {
                            return context.newNumber(Math.log10(assertNumber(args.getFieldValue(0, context))));
                        },
                        {
                            docs: "Returns the base-10 logarithm of the given number",
                            params: [[0, "a positive number", numberType]],
                            returns: "The base-10 logarithm of the given number"
                        }
                    )
                ),
                id(mathObject).assignField(
                    "exp",
                    jsFun(
                        (args, context) => {
                            return context.newNumber(Math.exp(assertNumber(args.getFieldValue(0, context))));
                        },
                        {
                            docs: "Returns e raised to the power of the given number",
                            params: [[0, "the exponent", numberType]],
                            returns: "e^exponent"
                        }
                    )
                ),
                id(mathObject).assignField(
                    "expm1",
                    jsFun(
                        (args, context) => {
                            return context.newNumber(Math.expm1(assertNumber(args.getFieldValue(0, context))));
                        },
                        {
                            docs: "Returns e^x - 1 of the given number",
                            params: [[0, "the exponent", numberType]],
                            returns: "e^x - 1"
                        }
                    )
                ),
                id(mathObject).assignField(
                    "log1p",
                    jsFun(
                        (args, context) => {
                            return context.newNumber(Math.log1p(assertNumber(args.getFieldValue(0, context))));
                        },
                        {
                            docs: "Returns the natural logarithm of (1 + x)",
                            params: [[0, "a number greater than -1", numberType]],
                            returns: "ln(1 + x)"
                        }
                    )
                ),
                id(mathObject).assignField(
                    "abs",
                    jsFun(
                        (args, context) => {
                            return context.newNumber(Math.abs(assertNumber(args.getFieldValue(0, context))));
                        },
                        {
                            docs: "Returns the absolute value of the given number",
                            params: [[0, "a number", numberType]],
                            returns: "The absolute value"
                        }
                    )
                ),
                id(mathObject).assignField(
                    "sign",
                    jsFun(
                        (args, context) => {
                            return context.newNumber(Math.sign(assertNumber(args.getFieldValue(0, context))));
                        },
                        {
                            docs: "Returns the sign of the given number",
                            params: [[0, "a number", numberType]],
                            returns: "1 if positive, -1 if negative, 0 if zero"
                        }
                    )
                ),
                id(mathObject).assignField(
                    "trunc",
                    jsFun(
                        (args, context) => {
                            return context.newNumber(Math.trunc(assertNumber(args.getFieldValue(0, context))));
                        },
                        {
                            docs: "Returns the integer part of the given number by removing any fractional digits",
                            params: [[0, "a number", numberType]],
                            returns: "The integer part of the given number"
                        }
                    )
                ),
                id(mathObject).assignField("PI", num(Math.PI)),
                id(mathObject).assignField("E", num(Math.E)),
                id(mathObject).assignField("LN2", num(Math.LN2)),
                id(mathObject).assignField("LN10", num(Math.LN10)),
                id(mathObject).assignField("LOG2E", num(Math.LOG2E)),
                id(mathObject).assignField("LOG10E", num(Math.LOG10E)),
                id(mathObject).assignField("SQRT2", num(Math.SQRT2)),
                id(mathObject).assignField("SQRT1_2", num(Math.SQRT1_2)),
                id(mathObject)
            ]).call()
        )
    ]
);
