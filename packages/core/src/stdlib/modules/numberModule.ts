import { assign, fun, id, jsFun, num } from "../../parser/astHelper";
import { InterpreterModule } from "../../runtime/interpreter";
import { NumberObject } from "../../runtime/objects/numberObject";
import { SemanticFieldNames } from "../../runtime/semanticFieldNames";
import { Type } from "../../types/base";
import { numberType } from "../../types/number";
import { DefaultModuleNames } from "../defaultModuleNames";
import { assertNumber } from "../typeHelpers";
import { toBoolean } from "./booleanModule";

/**
 * Name of the temporary field where the number prototype is assigned
 */
const numberProto = "numberProto";

/**
 * Identifier for the math object
 */
const mathObject = "Math";

/**
 * Type for number operator functions
 */
const numberOperatorFunctionTypes: [string | number, Type][] = [
    [0, numberType],
    [SemanticFieldNames.SELF, numberType]
];

/**
 * Number module providing numerical operators (+, -, *, /, %, <, <=, >, >=, ==)
 */
export const numberModule = InterpreterModule.create(
    DefaultModuleNames.NUMBER,
    [],
    [DefaultModuleNames.BOOLEAN],
    [
        fun([
            assign(numberProto, num(0).field(SemanticFieldNames.PROTO)),
            id(numberProto).assignField(
                "+",
                jsFun(
                    (args, context) => {
                        return context.newNumber(
                            assertNumber(args.getField(SemanticFieldNames.SELF, context)) +
                                assertNumber(args.getField(0, context))
                        );
                    },
                    {
                        docs: `
                            Calculates the sum of two numbers.
                            Params:
                                - "self": the left side of the sum, must be a number
                                - 0: the right side of the sum, must be a number
                            Returns:
                                The sum of the two numbers
                        `
                    },
                    numberOperatorFunctionTypes
                )
            ),
            id(numberProto).assignField(
                "-",
                jsFun(
                    (args, context) => {
                        return context.newNumber(
                            assertNumber(args.getField(SemanticFieldNames.SELF, context)) -
                                assertNumber(args.getField(0, context))
                        );
                    },
                    {
                        docs: `
                            Calculates the difference of two numbers.
                            Params:
                                - "self": the left side of the difference, must be a number
                                - 0: the right side of the difference, must be a number
                            Returns:
                                The difference of the two numbers
                        `
                    },
                    numberOperatorFunctionTypes
                )
            ),
            id(numberProto).assignField(
                "*",
                jsFun(
                    (args, context) => {
                        return context.newNumber(
                            assertNumber(args.getField(SemanticFieldNames.SELF, context)) *
                                assertNumber(args.getField(0, context))
                        );
                    },
                    {
                        docs: `
                            Calculates the product of two numbers.
                            Params:
                                - "self": the left side of the product, must be a number
                                - 0: the right side of the product, must be a number
                            Returns:
                                The product of the two numbers
                        `
                    },
                    numberOperatorFunctionTypes
                )
            ),
            id(numberProto).assignField(
                "/",
                jsFun(
                    (args, context) => {
                        return context.newNumber(
                            assertNumber(args.getField(SemanticFieldNames.SELF, context)) /
                                assertNumber(args.getField(0, context))
                        );
                    },
                    {
                        docs: `
                            Calculates the quotient of two numbers.
                            Params:
                                - "self": the left side of the quotient, must be a number
                                - 0: the right side of the quotient, must be a number
                            Returns:
                                The quotient of the two numbers
                        `
                    },
                    numberOperatorFunctionTypes
                )
            ),
            id(numberProto).assignField(
                "%",
                jsFun(
                    (args, context) => {
                        return context.newNumber(
                            assertNumber(args.getField(SemanticFieldNames.SELF, context)) %
                                assertNumber(args.getField(0, context))
                        );
                    },
                    {
                        docs: `
                            Calculates the modulus of two numbers.
                            Params:
                                - "self": the left side of the modulus, must be a number
                                - 0: the right side of the modulus, must be a number
                            Returns:
                                The modulus of the two numbers
                        `
                    },
                    numberOperatorFunctionTypes
                )
            ),
            id(numberProto).assignField(
                "<",
                jsFun(
                    (args, context) => {
                        return toBoolean(
                            assertNumber(args.getField(SemanticFieldNames.SELF, context)) <
                                assertNumber(args.getField(0, context)),
                            context
                        );
                    },
                    {
                        docs: `
                            Performs "<" comparison of two numbers.
                            Params:
                                - "self": the left side of the comparison, must be a number
                                - 0: the right side of the comparison, must be a number
                            Returns:
                                true if the left side is less than the right side
                        `
                    },
                    numberOperatorFunctionTypes
                )
            ),
            id(numberProto).assignField(
                ">",
                jsFun(
                    (args, context) => {
                        return toBoolean(
                            assertNumber(args.getField(SemanticFieldNames.SELF, context)) >
                                assertNumber(args.getField(0, context)),
                            context
                        );
                    },
                    {
                        docs: `
                            Performs ">" comparison of two numbers.
                            Params:
                                - "self": the left side of the comparison, must be a number
                                - 0: the right side of the comparison, must be a number
                            Returns:
                                true if the left side is greater than the right side
                        `
                    },
                    numberOperatorFunctionTypes
                )
            ),
            id(numberProto).assignField(
                "<=",
                jsFun(
                    (args, context) => {
                        return toBoolean(
                            assertNumber(args.getField(SemanticFieldNames.SELF, context)) <
                                assertNumber(args.getField(0, context)),
                            context
                        );
                    },
                    {
                        docs: `
                            Performs "<=" comparison of two numbers.
                            Params:
                                - "self": the left side of the comparison, must be a number
                                - 0: the right side of the comparison, must be a number
                            Returns:
                                true if the left side is less than or equal to the right side
                        `
                    },
                    numberOperatorFunctionTypes
                )
            ),
            id(numberProto).assignField(
                ">=",
                jsFun(
                    (args, context) => {
                        return toBoolean(
                            assertNumber(args.getField(SemanticFieldNames.SELF, context)) >
                                assertNumber(args.getField(0, context)),
                            context
                        );
                    },
                    {
                        docs: `
                            Performs ">=" comparison of two numbers.
                            Params:
                                - "self": the left side of the comparison, must be a number
                                - 0: the right side of the comparison, must be a number
                            Returns:
                                true if the left side is greater than or equal to the right side
                        `
                    },
                    numberOperatorFunctionTypes
                )
            ),
            id(numberProto).assignField(
                "==",
                jsFun(
                    (args, context) => {
                        const self = assertNumber(args.getField(SemanticFieldNames.SELF, context));
                        const other = args.getField(0, context);
                        let res: boolean;
                        if (other instanceof NumberObject) {
                            res = self === other.value;
                        } else {
                            res = false;
                        }
                        return toBoolean(res, context);
                    },
                    {
                        docs: `
                            Compares self to another value, returns true if they are the same number.
                            Params:
                                - "self": a number to compare
                                - 0: other value for the comparison
                            Returns:
                                true iff both values are the same number
                        `
                    },
                    [[SemanticFieldNames.SELF, numberType]]
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
                            return context.newNumber(Math.floor(assertNumber(args.getField(0, context))));
                        },
                        {
                            docs: `
                                Rounds a number down to the largester integer less than or equal to the provided value.
                                Params:
                                    - 0: the number to round down
                                Returns:
                                    The floored number
                            `
                        },
                        [[0, numberType]]
                    )
                ),
                id(mathObject).assignField(
                    "ceil",
                    jsFun(
                        (args, context) => {
                            return context.newNumber(Math.ceil(assertNumber(args.getField(0, context))));
                        },
                        {
                            docs: `
                                Rounds a number uü to the smallest integer greater than or equal to the provided value.
                                Params:
                                    - 0: the number to round up
                                Returns:
                                    The ceiled number
                            `
                        },
                        [[0, numberType]]
                    )
                ),
                id(mathObject).assignField(
                    "round",
                    jsFun(
                        (args, context) => {
                            return context.newNumber(Math.round(assertNumber(args.getField(0, context))));
                        },
                        {
                            docs: `
                                Rounds a number to the nearest integer.
                                Params:
                                    - 0: the number to round
                                Returns:
                                    The rounded number
                            `
                        },
                        [[0, numberType]]
                    )
                ),
                id(mathObject)
            ]).call()
        )
    ]
);
