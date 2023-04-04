import { ExecutableNativeExpression } from "../../runtime/ast/executableNativeExpression";
import { assign, fun, id, jsFun } from "../../runtime/executableAstHelper";
import { InterpreterModule } from "../../runtime/interpreter";
import { StringObject } from "../../runtime/objects/stringObject";
import { SemanticFieldNames } from "../../runtime/semanticFieldNames";
import { Type } from "../../types/base";
import { stringType } from "../../types/string";
import { DefaultModuleNames } from "../defaultModuleNames";
import { assertString } from "../typeHelpers";

/**
 * Name of the temporary field where the string prototype is assigned
 */
const stringProto = "stringProto";

/**
 * Type for string operator functions
 */
const stringOperatorFunctionTypes: [string | number, Type][] = [
    [0, stringType],
    [SemanticFieldNames.SELF, stringType]
];

/**
 * String module providing string functionality
 */
export const stringModule = InterpreterModule.create(
    DefaultModuleNames.STRING,
    [],
    [DefaultModuleNames.COMMON],
    [
        fun([
            assign(stringProto, new ExecutableNativeExpression((context) => ({ value: context.stringPrototype }))),
            id(stringProto).assignField(
                "<",
                jsFun(
                    (args, context) => {
                        return context.newBoolean(
                            assertString(args.getField(SemanticFieldNames.SELF, context)) <
                                assertString(args.getField(0, context))
                        );
                    },
                    {
                        docs: `
                            Performs "<" comparison of two strings.
                            Params:
                                - "self": the left side of the comparison, must be a string
                                - 0: the right side of the comparison, must be a string
                            Returns:
                                true if the left side is less than the right side
                        `
                    },
                    stringOperatorFunctionTypes
                )
            ),
            id(stringProto).assignField(
                ">",
                jsFun(
                    (args, context) => {
                        return context.newBoolean(
                            assertString(args.getField(SemanticFieldNames.SELF, context)) >
                                assertString(args.getField(0, context))
                        );
                    },
                    {
                        docs: `
                            Performs ">" comparison of two strings.
                            Params:
                                - "self": the left side of the comparison, must be a string
                                - 0: the right side of the comparison, must be a string
                            Returns:
                                true if the left side is greater than the right side
                        `
                    },
                    stringOperatorFunctionTypes
                )
            ),
            id(stringProto).assignField(
                "<=",
                jsFun(
                    (args, context) => {
                        return context.newBoolean(
                            assertString(args.getField(SemanticFieldNames.SELF, context)) <=
                                assertString(args.getField(0, context))
                        );
                    },
                    {
                        docs: `
                            Performs "<=" comparison of two strings.
                            Params:
                                - "self": the left side of the comparison, must be a string
                                - 0: the right side of the comparison, must be a string
                            Returns:
                                true if the left side is less than or equal to the right side
                        `
                    },
                    stringOperatorFunctionTypes
                )
            ),
            id(stringProto).assignField(
                ">=",
                jsFun(
                    (args, context) => {
                        return context.newBoolean(
                            assertString(args.getField(SemanticFieldNames.SELF, context)) >=
                                assertString(args.getField(0, context))
                        );
                    },
                    {
                        docs: `
                            Performs ">=" comparison of two strings.
                            Params:
                                - "self": the left side of the comparison, must be a string
                                - 0: the right side of the comparison, must be a string
                            Returns:
                                true if the left side is greater than or equal to the right side
                        `
                    },
                    stringOperatorFunctionTypes
                )
            ),
            id(stringProto).assignField(
                "==",
                jsFun(
                    (args, context) => {
                        const self = assertString(
                            args.getField(SemanticFieldNames.SELF, context),
                            "self argument of =="
                        );
                        const other = args.getField(0, context);
                        let res: boolean;
                        if (other instanceof StringObject) {
                            res = self === other.value;
                        } else {
                            res = false;
                        }
                        return context.newBoolean(res);
                    },
                    {
                        docs: `
                            Compares self to another value, returns true if they are the same string.
                            Params:
                                - "self": a string to compare
                                - 0: other value for the comparison
                            Returns:
                                true iff both values are the same string
                        `
                    },
                    [[SemanticFieldNames.SELF, stringType]]
                )
            ),
            id(stringProto).assignField(
                "+",
                jsFun(
                    (args, context) => {
                        const self = assertString(args.getField(SemanticFieldNames.SELF, context));
                        const other = assertString(args.getField(0, context));
                        return context.newString(self + other);
                    },
                    {
                        docs: `
                            Concatenates two strings.
                            Params:
                                - "self": the string to concatenate to
                                - 0: the concatenated value, must be a string
                            Returns:
                                concatenation of the two strings
                        `
                    },
                    [
                        [0, stringType],
                        [SemanticFieldNames.SELF, stringType]
                    ]
                )
            )
        ]).call()
    ]
);
