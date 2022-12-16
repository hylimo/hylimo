import { assign, fun, id, jsFun, num } from "../../parser/astHelper";
import { InterpreterModule } from "../../runtime/interpreter";
import { NumberObject } from "../../runtime/objects/number";
import { SemanticFieldNames } from "../../runtime/semanticFieldNames";
import { Type } from "../../types/base";
import { numberType } from "../../types/number";
import { DefaultModuleNames } from "../defaultModuleNames";
import { assertNumber } from "../typeHelpers";
import { toBoolean } from "./boolean";

/**
 * Name of the temporary field where the number prototype is assigned
 */
const numberProto = "numberProto";

/**
 * Type for number operator functions
 */
const numberOperatorFunctionTypes = new Map<string | number, Type>([
    [0, numberType],
    [SemanticFieldNames.SELF, numberType]
]);

/**
 * Number module providing numerical operators (+, -, *, /, %, <, <=, >, >=, ==)
 */
export const numberModule: InterpreterModule = {
    name: DefaultModuleNames.NUMBER,
    dependencies: [],
    runtimeDependencies: [DefaultModuleNames.BOOLEAN],
    expressions: [
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
                    new Map([[SemanticFieldNames.SELF, numberType]])
                )
            )
        ]).call()
    ]
};
